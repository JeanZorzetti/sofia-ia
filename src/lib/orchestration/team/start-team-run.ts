// Shared "start a Team run" trigger. Extracted from POST /api/teams/[id]/run so the
// run route (session), the SP3 cron, and the SP4 API-key route all dispatch identically.
// The coordinator (runTeam) stays INTACT — this is just a caller.
// after() is valid inside any request handler (run route OR cron GET).
import { after } from 'next/server'
import { prisma } from '@/lib/prisma'

export type TeamRunMode = 'chat' | 'code'

export type StartTeamRunInput = {
  mission: string
  mode: TeamRunMode
  userId: string
  repoUrl?: string | null
  base?: string | null
  /** Phase 1 (Teams subordination): optional same-process hook fired after a
   *  CHAT-run completes (right after output webhooks). Lets a caller ingest the
   *  run output — e.g. Threads campaigns → posts — without a self-webhook
   *  round-trip. Best-effort: failures are logged, never thrown. Code-runs
   *  (queued, out-of-process) ignore it. */
  onComplete?: (runId: string) => Promise<void>
}

export type StartTeamRunResult = { runId: string; mode: TeamRunMode }

export type TeamRunErrorCode = 'not_found' | 'invalid_roster' | 'missing_mission' | 'queue_unavailable'

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
    data: { teamId, mission, status: 'pending', mode, repoUrl, baseBranch },
  })

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
        await runTeamByTopology(run.id, {
          store: createPrismaTeamStore(),
          chat: (agentId, messages, ctx, opts) => chatWithAgent(agentId, messages as never, ctx, opts),
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
  await runTeamByTopology(run.id, {
    store: createPrismaTeamStore(),
    chat: (agentId, messages, ctx, opts) => chatWithAgent(agentId, messages as never, ctx, opts),
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
