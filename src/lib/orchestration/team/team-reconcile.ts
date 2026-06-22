// src/lib/orchestration/team/team-reconcile.ts
// Safety net for async (background) runs.
//
// Two execution shapes exist:
//  - CHAT-runs execute the coordinator via `after()` (in-process, post-response);
//    a process restart mid-run leaves them stuck in 'pending'/'running' forever.
//  - CODE-runs go through a DURABLE BullMQ queue + a separate worker; a worker
//    crash/restart can likewise orphan them.
// As a stopgap (gated only on age since `startedAt`), mark such orphaned runs as
// 'failed' once they exceed a TTL. The TTL is MODE-AWARE: a code-run legitimately
// runs far longer than a chat-run (it clones a repo, bootstraps the CLI, and runs
// the agentic CLI + `npm build` per task), so a 15-min TTL was killing HEALTHY
// code-runs mid-build (false-positive orphan). Code-runs get a much larger budget.

import { prisma } from '@/lib/prisma'

export const STALE_RUN_TTL_MS = 15 * 60 * 1000 // 15 minutes (chat-runs)
export const STALE_CODE_RUN_TTL_MS = 60 * 60 * 1000 // 60 minutes (code-runs: clone + CLI + build)

/**
 * If `runId` is still pending/running but older than its mode's TTL, mark it failed.
 * Two atomic conditional updates (no-op when the run is fresh, already terminal, or
 * doesn't match the mode arm). Code-runs use a 60-min TTL; everything else 15-min.
 */
export async function reconcileStaleRun(runId: string): Promise<void> {
  const now = Date.now()
  const failData = {
    status: 'failed',
    error: 'Run órfão (processo reiniciado durante a execução)',
    completedAt: new Date(),
  }
  // Non-code (chat) runs: 15-min cutoff (unchanged behavior).
  await prisma.teamRun.updateMany({
    where: {
      id: runId,
      mode: { not: 'code' },
      status: { in: ['pending', 'running'] },
      startedAt: { lt: new Date(now - STALE_RUN_TTL_MS) },
    },
    data: failData,
  })
  // Code-runs: 60-min cutoff (clone + CLI + npm build is slow; avoid false orphans).
  await prisma.teamRun.updateMany({
    where: {
      id: runId,
      mode: 'code',
      status: { in: ['pending', 'running'] },
      startedAt: { lt: new Date(now - STALE_CODE_RUN_TTL_MS) },
    },
    data: failData,
  })
}
