// Shared "start a Team run" trigger. Extracted from POST /api/teams/[id]/run so the
// run route (session), the SP3 cron, and the SP4 API-key route all dispatch identically.
// The coordinator (runTeam) stays INTACT — this is just a caller.
// after() is valid inside any request handler (run route OR cron GET).
import { after } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { TeamAttachment } from './team-attachments'

export type TeamRunMode = 'chat' | 'code'

export type StartTeamRunInput = {
  mission: string
  mode: TeamRunMode
  userId: string
  repoUrl?: string | null
  base?: string | null
  /** S3.1: git delivery mode for code-runs. 'direct' = commit na base sem PR;
   *  qualquer outra coisa (null/'pr'/lixo) = legado (branch + PR draft). Sanitizado
   *  no create (só grava 'direct' ou null). Inerte em chat-runs. */
  gitMode?: string | null
  /** Preview mode (Lovable-style): after a repo-bound code-run completes, the worker
   *  keeps the sandbox alive, boots the dev server and exposes a public URL for an
   *  iframe. Only persisted (and acted on) for code-runs; inert in chat-runs. */
  previewEnabled?: boolean
  /** Iteration (Lovable follow-up): continue a previous run IN ITS LIVE SANDBOX — reuse the
   *  branch + working tree + running preview, committing only the incremental diff. Requires
   *  the parent to be a completed code-run whose preview is still live. */
  continueFromRunId?: string
  /** Phase 1 (Teams subordination): optional same-process hook fired after a
   *  CHAT-run completes (right after output webhooks). Lets a caller ingest the
   *  run output — e.g. Threads campaigns → posts — without a self-webhook
   *  round-trip. Best-effort: failures are logged, never thrown. Code-runs
   *  (queued, out-of-process) ignore it. */
  onComplete?: (runId: string) => Promise<void>
  /** S6 (item 5b): image attachments uploaded with the mission. Persisted as an
   *  initial `kind:'user'` message so the Lead surfaces them in turn 1 (vision).
   *  Already uploaded to MinIO by the route; this only carries the metadata. */
  attachments?: TeamAttachment[]
}

export type StartTeamRunResult = { runId: string; mode: TeamRunMode }

export type TeamRunErrorCode = 'not_found' | 'invalid_roster' | 'missing_mission' | 'queue_unavailable' | 'continuation_unavailable'

export class TeamRunError extends Error {
  code: TeamRunErrorCode
  constructor(code: TeamRunErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'TeamRunError'
  }
}

export async function startTeamRun(teamId: string, input: StartTeamRunInput): Promise<StartTeamRunResult> {
  const mode: TeamRunMode = input.mode === 'code' ? 'code' : 'chat'

  // Ownership + roster are resolved FIRST (faithful to the original route order:
  // a request to a non-owned team returns not_found even if the mission is missing).
  const team = await prisma.team.findFirst({
    where: { id: teamId, createdBy: input.userId },
    include: { members: true },
  })
  if (!team) throw new TeamRunError('not_found', 'Team not found')
  if (!team.members.some(m => m.role === 'lead') || !team.members.some(m => m.role === 'worker')) {
    throw new TeamRunError('invalid_roster', 'Roster inválido (precisa de Lead e Worker)')
  }

  const mission = input.mission?.trim()
  if (!mission) throw new TeamRunError('missing_mission', 'Missão é obrigatória')

  // Iteration (Lovable follow-up): continue a previous run IN ITS LIVE SANDBOX. Reuses the
  // branch + working tree + running preview; the worker connects (no clone) and commits the
  // incremental diff. The coordinator stays INTACT — this is just a different run shape.
  if (input.continueFromRunId) {
    const parent = await prisma.teamRun.findFirst({
      where: { id: input.continueFromRunId, teamId, team: { createdBy: input.userId } },
      select: {
        id: true, mode: true, repoUrl: true, baseBranch: true, branch: true, gitMode: true, sandboxId: true,
        previewEnabled: true, previewStatus: true, previewUrl: true, previewPort: true, previewExpiresAt: true,
        prUrl: true, prNumber: true, commitSha: true,
      },
    })
    if (!parent) throw new TeamRunError('not_found', 'Run pai não encontrada')
    if (parent.mode !== 'code' || !parent.repoUrl) {
      throw new TeamRunError('continuation_unavailable', 'Só dá pra iterar em code-runs com repositório')
    }
    if (parent.previewStatus !== 'live' || !parent.sandboxId) {
      throw new TeamRunError('continuation_unavailable', 'A sessão de preview expirou — dispare uma nova missão')
    }

    const run = await prisma.teamRun.create({
      data: {
        teamId, mission, status: 'pending', mode: 'code', parentRunId: parent.id,
        repoUrl: parent.repoUrl, baseBranch: parent.baseBranch, branch: parent.branch, gitMode: parent.gitMode,
        sandboxId: parent.sandboxId,
        prUrl: parent.prUrl, prNumber: parent.prNumber, commitSha: parent.commitSha,
        // Inherit the LIVE preview so the iframe stays up during the follow-up (HMR updates it).
        previewEnabled: parent.previewEnabled, previewStatus: 'live',
        previewUrl: parent.previewUrl, previewPort: parent.previewPort, previewExpiresAt: parent.previewExpiresAt,
      },
    })
    // Hand the sandbox over: the parent must stop "owning" it so the reaper / lazy-expiry
    // don't kill the sandbox the child is now using ('superseded' is ignored by both).
    await prisma.teamRun.update({ where: { id: parent.id }, data: { previewStatus: 'superseded' } }).catch(() => {})

    if (input.attachments && input.attachments.length > 0) {
      await prisma.teamMessage.create({
        data: {
          runId: run.id, kind: 'user',
          content: 'Imagens anexadas à missão (para análise visual).',
          attachments: input.attachments as unknown as object,
        },
      })
    }

    try {
      const { enqueueCodeRun } = await import('@/lib/queue/code-run-queue')
      await enqueueCodeRun(run.id)
    } catch (err) {
      await prisma.teamRun.update({ where: { id: run.id }, data: { status: 'failed', error: 'Fila indisponível (REDIS_URL não configurada?)' } })
      console.error('[Teams] enqueue continuation failed:', err)
      throw new TeamRunError('queue_unavailable', 'Fila de code-runs indisponível')
    }
    return { runId: run.id, mode: 'code' }
  }

  // Repo binding (code-runs only): hybrid resolution — request override, then Team.config.
  // The git token is NEVER stored here; it lives only in the worker env.
  let repoUrl: string | null = null
  let baseBranch: string | null = null
  if (mode === 'code') {
    const cfg = (team.config && typeof team.config === 'object' ? team.config : {}) as Record<string, unknown>
    const pick = (...vals: unknown[]) => vals.map(v => (typeof v === 'string' ? v.trim() : '')).find(Boolean) ?? ''
    repoUrl = pick(input.repoUrl, cfg.repoUrl) || null
    if (repoUrl) baseBranch = pick(input.base, cfg.defaultBranch) || 'main'
  }

  const run = await prisma.teamRun.create({
    // gitMode sanitized at the single write point: only 'direct' or null ever lands
    // in the column (never junk / never overflows VarChar(20)). null = legacy 'pr'.
    // previewEnabled only for code-runs WITH a repo (nothing to serve otherwise).
    data: {
      teamId, mission, status: 'pending', mode, repoUrl, baseBranch,
      gitMode: input.gitMode === 'direct' ? 'direct' : null,
      previewEnabled: input.previewEnabled === true && mode === 'code' && !!repoUrl,
    },
  })

  // S6 (item 5b): persist mission images as an initial `kind:'user'` message so the
  // Lead surfaces them in turn 1 (same path as live steering). Both modes: chat-runs
  // materialize on the app host; code-runs sync them into the sandbox per worker turn.
  if (input.attachments && input.attachments.length > 0) {
    await prisma.teamMessage.create({
      data: {
        runId: run.id,
        kind: 'user',
        content: 'Imagens anexadas à missão (para análise visual).',
        attachments: input.attachments as unknown as object,
      },
    })
  }

  if (mode === 'code') {
    // Code-runs go through a DURABLE queue consumed by a separate worker service.
    try {
      const { enqueueCodeRun } = await import('@/lib/queue/code-run-queue')
      await enqueueCodeRun(run.id)
    } catch (err) {
      await prisma.teamRun.update({
        where: { id: run.id },
        data: { status: 'failed', error: 'Fila indisponível (REDIS_URL não configurada?)' },
      })
      console.error('[Teams] enqueue code-run failed:', err)
      throw new TeamRunError('queue_unavailable', 'Fila de code-runs indisponível')
    }
  } else {
    // Chat-runs: run the coordinator AFTER the response is flushed.
    after(async () => {
      try {
        const { runTeamByTopology } = await import('@/lib/orchestration/team/team-executor')
        const { createPrismaTeamStore } = await import('@/lib/orchestration/team/team-store')
        const { chatWithAgent } = await import('@/lib/ai/groq')
        const { withUsageTracking } = await import('@/lib/orchestration/team/member-usage-recorder')
        // S3 (Teams V2.2 — item 3): resolve the team-wide system prompt ONCE and bake it
        // into the chat wrapper, so every member call inherits it WITHOUT touching the
        // coordinator (it's a team-level constant, not per-member). Null → byte-identical
        // legacy call. (Code-runs go through the worker, which has its own wrapper; the
        // dominant CLI-native sandbox path builds its own prompt — same caveat as S3.1.)
        const { readTeamSystemPrompt } = await import('@/lib/orchestration/team/team-system-prompt')
        const teamSystemPrompt = readTeamSystemPrompt(team.config)
        // S6: download any mission/steering images to the per-run temp dir and inject its
        // path into the chat wrapper so every member call gets `--add-dir` (vision). Null
        // when the run has no attachments → wrapper call byte-identical to legacy.
        const { materializeRunAttachments } = await import('@/lib/orchestration/team/materialize-attachments')
        const attachmentDir = await materializeRunAttachments(run.id)
        await runTeamByTopology(run.id, {
          store: createPrismaTeamStore(),
          chat: withUsageTracking((agentId, messages, ctx, opts) => chatWithAgent(agentId, messages as never, ctx, { ...opts, teamSystemPrompt, attachmentDir })),
        })
        const { dispatchTeamOutputs } = await import('@/lib/orchestration/team/team-outputs')
        await dispatchTeamOutputs(run.id)
        if (input.onComplete) {
          try { await input.onComplete(run.id) }
          catch (err) { console.error('[Teams] onComplete hook failed:', err) }
        }
      } catch (err) {
        console.error('[Teams] background run failed:', err)
      }
    })
  }

  return { runId: run.id, mode }
}

export type RunTeamAndWaitInput = { mission: string }

export type RunTeamAndWaitResult = {
  runId: string
  /** Terminal run status: 'completed' | 'failed' | 'rate_limited' | 'cancelled' */
  status: string
  /** Lead consolidation on success; null otherwise */
  output: string | null
  error: string | null
  teamName: string
}

/**
 * Phase 2 (Teams subordination): run a Team through the REAL engine and wait for
 * the terminal result — INLINE (no `after()`, no polling). Used by the Workflows
 * `action_team` node, whose `execute()` is fully awaited inside `executeFlow`, so
 * the coordinator can run synchronously here and persist a real `TeamRun`
 * (tasks/messages) instead of the node's old bespoke `chatWithAgent` loop.
 *
 * This is a CALLER, like `startTeamRun` — the coordinator (`runTeam`) stays INTACT.
 * It mirrors `startTeamRun`'s chat branch minus the `after()` wrapper (polling +
 * `after()` would deadlock: the background callback only fires once the trigger
 * request has flushed, which never happens while the flow node is still running).
 * Chat-mode only — workflows compose content/automation, not code-runs.
 *
 * Throws `TeamRunError` for pre-run problems (team not found / invalid roster /
 * missing mission). A run that *finishes* in a non-completed status is RETURNED
 * (not thrown) so the caller decides — the node throws to fail the flow step.
 */
export async function runTeamAndWait(teamId: string, input: RunTeamAndWaitInput): Promise<RunTeamAndWaitResult> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { members: true },
  })
  if (!team) throw new TeamRunError('not_found', `Time não encontrado: ${teamId}`)
  if (!team.members.some(m => m.role === 'lead') || !team.members.some(m => m.role === 'worker')) {
    throw new TeamRunError('invalid_roster', 'Roster inválido (precisa de Lead e Worker)')
  }

  const mission = input.mission?.trim()
  if (!mission) throw new TeamRunError('missing_mission', 'Missão é obrigatória')

  const run = await prisma.teamRun.create({
    data: { teamId, mission, status: 'pending', mode: 'chat' },
  })

  // Run the coordinator INLINE (same deps as startTeamRun's chat branch, no after()).
  // Routes through the topology dispatcher so graph-topology teams use runTeamGraph.
  const { runTeamByTopology } = await import('@/lib/orchestration/team/team-executor')
  const { createPrismaTeamStore } = await import('@/lib/orchestration/team/team-store')
  const { chatWithAgent } = await import('@/lib/ai/groq')
  const { withUsageTracking } = await import('@/lib/orchestration/team/member-usage-recorder')
  // S3 (Teams V2.2 — item 3): same team-wide system prompt injection as startTeamRun's
  // chat branch — baked into the wrapper, coordinator untouched. Null → legacy call.
  const { readTeamSystemPrompt } = await import('@/lib/orchestration/team/team-system-prompt')
  const teamSystemPrompt = readTeamSystemPrompt(team.config)
  await runTeamByTopology(run.id, {
    store: createPrismaTeamStore(),
    chat: withUsageTracking((agentId, messages, ctx, opts) => chatWithAgent(agentId, messages as never, ctx, { ...opts, teamSystemPrompt })),
  })

  // Output webhooks (SP2) fire for engine runs too — best-effort, never fails the node.
  try {
    const { dispatchTeamOutputs } = await import('@/lib/orchestration/team/team-outputs')
    await dispatchTeamOutputs(run.id)
  } catch (err) {
    console.error('[Teams] dispatchTeamOutputs (runTeamAndWait) failed:', err)
  }

  const finished = await prisma.teamRun.findUnique({
    where: { id: run.id },
    select: { status: true, output: true, error: true },
  })

  return {
    runId: run.id,
    status: finished?.status ?? 'failed',
    output: finished?.output ?? null,
    error: finished?.error ?? null,
    teamName: team.name,
  }
}
