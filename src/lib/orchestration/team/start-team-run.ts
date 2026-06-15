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
  const mission = input.mission?.trim()
  if (!mission) throw new TeamRunError('missing_mission', 'Missão é obrigatória')
  const mode: TeamRunMode = input.mode === 'code' ? 'code' : 'chat'

  const team = await prisma.team.findFirst({
    where: { id: teamId, createdBy: input.userId },
    include: { members: true },
  })
  if (!team) throw new TeamRunError('not_found', 'Team not found')
  if (!team.members.some(m => m.role === 'lead') || !team.members.some(m => m.role === 'worker')) {
    throw new TeamRunError('invalid_roster', 'Roster inválido (precisa de Lead e Worker)')
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
        const { runTeam } = await import('@/lib/orchestration/team/team-coordinator')
        const { createPrismaTeamStore } = await import('@/lib/orchestration/team/team-store')
        const { chatWithAgent } = await import('@/lib/ai/groq')
        await runTeam(run.id, {
          store: createPrismaTeamStore(),
          chat: (agentId, messages, ctx, opts) => chatWithAgent(agentId, messages as never, ctx, opts),
        })
        const { dispatchTeamOutputs } = await import('@/lib/orchestration/team/team-outputs')
        await dispatchTeamOutputs(run.id)
      } catch (err) {
        console.error('[Teams] background run failed:', err)
      }
    })
  }

  return { runId: run.id, mode }
}
