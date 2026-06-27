// src/lib/orchestration/team/serialize-store.ts
// 010 — Serialization decorator for code-runs with a reviewer.
//
// When a run has a reviewer and a cloned repo, workers share a single working
// tree. Running them in parallel would interleave changes, making it impossible
// to attribute each diff to the worker that produced it (the snapshot approach
// requires one worker at a time). This decorator forces `config.maxParallel = 1`
// in `loadRun` when the roster contains a reviewer.
//
// The graph coordinator already respects `config.maxParallel` (it reads it on
// every iteration at line 76 of team-graph-coordinator.ts). The linear coordinator
// is already sequential. Neither coordinator is touched — Princípio II is intact.
// Runs without a reviewer are unaffected (passthrough, no performance cost).

import type { TeamStore } from './team-store'

export function withReviewerSerialization(store: TeamStore): TeamStore {
  return {
    ...store,
    async loadRun(runId) {
      const run = await store.loadRun(runId)
      if (!run) return run
      if (run.members.some(m => m.role === 'reviewer')) {
        return { ...run, config: { ...run.config, maxParallel: 1 } }
      }
      return run
    },
  }
}
