// src/lib/orchestration/team/team-executor.ts
// Topology dispatcher: picks the linear coordinator (`runTeam`, INTACT) or the
// graph coordinator (`runTeamGraph`) based on `Team.config.topology`. Every run
// trigger — the chat `after()` branch and `runTeamAndWait` (start-team-run.ts)
// and the code-run worker (worker/index.ts) — calls THIS instead of `runTeam`
// directly, so the opt-in graph mode is wired in exactly one place.
//
// This is a CALLER (like startTeamRun): it may read Prisma. The coordinators
// themselves stay free of topology semantics and depend only on the injected
// TeamStore + ChatFn.
import { prisma } from '@/lib/prisma'
import { runTeam, type RunTeamDeps } from './team-coordinator'
import { runTeamGraph } from './team-graph-coordinator'

export type TeamTopology = 'linear' | 'graph'

/** Pure: derive the topology from a raw `Team.config` value. Anything other than
 *  an explicit `'graph'` falls back to `'linear'` — so every existing team (no
 *  flag set) keeps running the linear coordinator. Backward-compatible. */
export function pickTopology(config: unknown): TeamTopology {
  const cfg = (config && typeof config === 'object' ? config : {}) as Record<string, unknown>
  return cfg.topology === 'graph' ? 'graph' : 'linear'
}

/** Reads `Team.config.topology` for a run (one light query). Defaults to linear. */
export async function resolveRunTopology(runId: string): Promise<TeamTopology> {
  const run = await prisma.teamRun.findUnique({
    where: { id: runId },
    select: { team: { select: { config: true } } },
  })
  return pickTopology(run?.team?.config)
}

/** Dispatch a run to the executor selected by its team's topology. */
export async function runTeamByTopology(runId: string, deps: RunTeamDeps): Promise<void> {
  const topology = await resolveRunTopology(runId)
  return topology === 'graph' ? runTeamGraph(runId, deps) : runTeam(runId, deps)
}
