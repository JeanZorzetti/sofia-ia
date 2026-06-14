// src/worker/index.ts
// Standalone BullMQ worker that executes code-runs (Sub-projeto C — C0).
// Deploy as a SEPARATE EasyPanel service from the same repo/image:
//   start command: `npm run worker`  (needs devDeps — tsx — installed)
// Reuses the A coordinator (runTeam) unchanged, injecting the code-agent ChatFn.
import { Worker, type Job } from 'bullmq'
import { prisma } from '@/lib/prisma'
import { getQueueConnection, CODE_RUN_QUEUE } from '@/lib/queue/connection'
import type { CodeRunJob } from '@/lib/queue/code-run-queue'
import { runTeam } from '@/lib/orchestration/team/team-coordinator'
import { createPrismaTeamStore } from '@/lib/orchestration/team/team-store'
import { createCodeChatFn } from '@/lib/orchestration/team/code-agent'
import { chatWithAgent } from '@/lib/ai/groq'
import { getSandboxProvider } from '@/lib/sandbox'

const concurrency = Number(process.env.CODE_RUN_CONCURRENCY ?? 2)

const worker = new Worker<CodeRunJob>(
  CODE_RUN_QUEUE,
  async (job: Job<CodeRunJob>) => {
    const { runId } = job.data
    console.log(`[worker] starting code-run ${runId}`)
    const sandbox = await getSandboxProvider().create()
    try {
      await prisma.teamRun
        .update({ where: { id: runId }, data: { sandboxId: sandbox.id } })
        .catch(() => {}) // best-effort: don't fail the run if this metadata write fails
      const codeChat = createCodeChatFn(sandbox, (agentId, messages, ctx, opts) =>
        chatWithAgent(agentId, messages as never, ctx, opts),
      )
      await runTeam(runId, { store: createPrismaTeamStore(), chat: codeChat })
    } finally {
      await sandbox.close().catch(() => {}) // always tear down — avoids leaked/charged sandboxes
    }
  },
  { connection: getQueueConnection(), concurrency },
)

worker.on('completed', (job: Job<CodeRunJob>) => console.log(`[worker] completed ${job.id}`))
worker.on('failed', (job: Job<CodeRunJob> | undefined, err: Error) =>
  console.error(`[worker] failed ${job?.id}:`, err),
)

console.log(`[worker] code-run worker online (queue=${CODE_RUN_QUEUE}, concurrency=${concurrency})`)
