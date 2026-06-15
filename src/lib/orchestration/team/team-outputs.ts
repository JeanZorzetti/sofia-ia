// src/lib/orchestration/team/team-outputs.ts
// SP2 — fire output webhooks/email/slack when a Team run completes successfully.
// Coordinator (runTeam) stays INTACT: this is called from the CALLERS (run route
// + worker) AFTER runTeam resolves. Reuses the generic dispatchOutputWebhooks.
//
// prisma is imported LAZILY (inside dispatchTeamOutputs) so the PURE
// buildTeamDispatchArgs can be unit-tested under tsx without loading the Prisma
// client (which instantiates at module load and breaks on this machine's OneDrive
// node_modules). The `Prisma` type is import-type-only (erased at runtime).
import type { Prisma } from '@prisma/client'
import { dispatchOutputWebhooks, type DispatchOpts, type OutputWebhookConfig } from '../output-webhooks'

const TEAM_OPTS: DispatchOpts = { completedLabel: 'Time concluído', event: 'team.completed' }

export interface TeamRunLike {
  id: string
  status: string
  output: string | null
  durationMs: number | null
  tokensUsed: number | null
}
export interface TeamLike {
  id: string
  name: string
  config: unknown
}

export type TeamDispatchPlan =
  | { dispatch: false }
  | {
      dispatch: true
      entity: { id: string; name: string; config: unknown }
      execution: { id: string; durationMs: number; tokensUsed: number }
      finalOutput: unknown
      opts: DispatchOpts
    }

/** PURE — decide whether to dispatch and build the args. No DB, no network. */
export function buildTeamDispatchArgs(run: TeamRunLike, team: TeamLike): TeamDispatchPlan {
  if (run.status !== 'completed') return { dispatch: false }
  const config = (team.config && typeof team.config === 'object' ? team.config : {}) as Record<string, unknown>
  const webhooks = (config.outputWebhooks ?? []) as OutputWebhookConfig[]
  if (!Array.isArray(webhooks) || !webhooks.some((w) => w?.enabled)) return { dispatch: false }
  return {
    dispatch: true,
    entity: { id: team.id, name: team.name, config: team.config },
    execution: { id: run.id, durationMs: run.durationMs ?? 0, tokensUsed: run.tokensUsed ?? 0 },
    finalOutput: run.output,
    opts: TEAM_OPTS,
  }
}

/** BORDER — load run+team, dispatch, persist records. Best-effort, NEVER throws
 *  (the run already finished successfully; outputs are a side-effect). */
export async function dispatchTeamOutputs(runId: string): Promise<void> {
  try {
    const { prisma } = await import('@/lib/prisma')
    const run = await prisma.teamRun.findUnique({
      where: { id: runId },
      select: {
        id: true, status: true, output: true, durationMs: true, tokensUsed: true,
        team: { select: { id: true, name: true, config: true } },
      },
    })
    if (!run || !run.team) return
    const plan = buildTeamDispatchArgs(run, run.team)
    if (!plan.dispatch) return
    const records = await dispatchOutputWebhooks(
      { id: plan.entity.id, name: plan.entity.name, config: plan.entity.config },
      plan.execution,
      plan.finalOutput,
      plan.opts,
    )
    if (records.length > 0) {
      await prisma.teamRun
        .update({ where: { id: runId }, data: { outputDispatches: records as unknown as Prisma.InputJsonValue } as Prisma.TeamRunUpdateInput })
        .catch(() => {})
    }
  } catch (err) {
    console.error(`[TeamOutputs] dispatch failed for run ${runId}:`, err)
  }
}
