// src/lib/queue/code-run-queue.ts
// Durable queue for code-runs (Sub-projeto C — C0). Producer side: the run route
// enqueues; the standalone worker (src/worker/index.ts) consumes.
import { Queue } from 'bullmq'
import { getQueueConnection, CODE_RUN_QUEUE } from './connection'

export interface CodeRunJob {
  runId: string
}

let queue: Queue<CodeRunJob> | null = null

function getCodeRunQueue(): Queue<CodeRunJob> {
  if (!queue) queue = new Queue<CodeRunJob>(CODE_RUN_QUEUE, { connection: getQueueConnection() })
  return queue
}

export async function enqueueCodeRun(runId: string): Promise<void> {
  await getCodeRunQueue().add(
    'run',
    { runId },
    {
      jobId: runId, // idempotent enqueue per run
      attempts: 1, // a code run is stateful (sandbox side-effects) — don't auto-retry the whole run in C0
      removeOnComplete: 200,
      removeOnFail: 500,
    },
  )
}
