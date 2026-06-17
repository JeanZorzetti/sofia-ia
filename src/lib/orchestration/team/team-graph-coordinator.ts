// src/lib/orchestration/team/team-graph-coordinator.ts
// Graph-topology team executor — opt-in via `Team.config.topology = 'graph'`.
//
// G0 (this fatia): PARITY ONLY. The graph executor delegates to the linear
// coordinator (`runTeam`) so behaviour is byte-identical — this fatia exists
// solely to establish the dispatch seam (see team-executor.ts) with ZERO
// regression. Subsequent fatias progressively fork this into a real DAG-driven
// loop, while `runTeam` stays INTACT:
//   G1 — task dependencies (DAG gating via TeamTask.dependsOn)
//   G2 — agenda state-machine (deriveTaskAction → nextAction/actionOwner)
//   G3 — parallel agendas (fan-out/fan-in with a concurrency cap)
//
// Shares the same RunTeamDeps (store + chat + getTaskDiff) as the linear path,
// so chat-runs and code-runs route through it unchanged.
import { runTeam, type RunTeamDeps } from './team-coordinator'

export async function runTeamGraph(runId: string, deps: RunTeamDeps): Promise<void> {
  // G0 parity: run the linear coordinator. Replaced by the graph loop in G1+.
  return runTeam(runId, deps)
}
