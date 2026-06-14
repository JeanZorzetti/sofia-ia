// src/lib/orchestration/team/team-reconcile.ts
// Safety net for async (background) runs.
//
// Since `POST /run` now executes the coordinator via `after()` (in-process,
// post-response), a process restart mid-run leaves the run stuck in
// 'pending'/'running' forever. There is no durable queue yet (that lands in
// Sub-project C). As a stopgap, mark such orphaned runs as 'failed' once they
// exceed a generous TTL. A legitimately running run keeps writing board/message
// rows, but this is gated only on age since `startedAt`, so the TTL is set well
// above any realistic run duration to avoid killing live work.

import { prisma } from '@/lib/prisma'

export const STALE_RUN_TTL_MS = 15 * 60 * 1000 // 15 minutes

/**
 * If `runId` is still pending/running but older than the TTL, mark it failed.
 * Atomic conditional update (no-op when the run is fresh or already terminal).
 */
export async function reconcileStaleRun(runId: string): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_RUN_TTL_MS)
  await prisma.teamRun.updateMany({
    where: {
      id: runId,
      status: { in: ['pending', 'running'] },
      startedAt: { lt: cutoff },
    },
    data: {
      status: 'failed',
      error: 'Run órfão (processo reiniciado durante a execução)',
      completedAt: new Date(),
    },
  })
}
