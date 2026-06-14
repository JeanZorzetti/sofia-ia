// src/worker/index.ts
// Standalone BullMQ worker that executes code-runs (Sub-projeto C — C0 + C1).
// Deploy as a SEPARATE EasyPanel service from the same repo/image:
//   start command: `npm run worker`  (needs devDeps — tsx — installed)
// Reuses the A coordinator (runTeam) unchanged, injecting the code-agent ChatFn.
//
// C1 adds a GIT LIFECYCLE around runTeam when the run is bound to a repo:
//   setup  → clone repo + create working branch (worker; token via HTTP header)
//   runTeam → agents edit files in the repo dir (coordinator INTACT)
//   teardown → commit + push + open a draft PR (worker; token never in agent ctx)
// Runs WITHOUT a repo behave exactly like C0 (no clone/PR).
import { Worker, type Job } from 'bullmq'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getQueueConnection, CODE_RUN_QUEUE } from '@/lib/queue/connection'
import type { CodeRunJob } from '@/lib/queue/code-run-queue'
import { runTeam } from '@/lib/orchestration/team/team-coordinator'
import { createPrismaTeamStore } from '@/lib/orchestration/team/team-store'
import { createCodeChatFn } from '@/lib/orchestration/team/code-agent'
import { chatWithAgent } from '@/lib/ai/groq'
import { getSandboxProvider } from '@/lib/sandbox'
import type { Sandbox } from '@/lib/sandbox/types'
import { setupRepo, commitAndPush, openPullRequest, buildPrBody } from '@/lib/git/repo-lifecycle'

const concurrency = Number(process.env.CODE_RUN_CONCURRENCY ?? 2)

// Absolute path inside the E2B sandbox where the repo is cloned (home of the default user).
const WORKDIR = '/home/user/repo'
const AUTHOR_NAME = process.env.GIT_AUTHOR_NAME ?? 'Polaris Teams'
const AUTHOR_EMAIL = process.env.GIT_AUTHOR_EMAIL ?? 'polaris@polarisia.com.br'

const baseChat = (agentId: string, messages: unknown, ctx: unknown, opts: unknown) =>
  chatWithAgent(agentId, messages as never, ctx as never, opts as never)

async function failRun(runId: string, message: string): Promise<void> {
  console.error(`[worker] ${runId} failed: ${message}`)
  await prisma.teamRun
    .update({ where: { id: runId }, data: { status: 'failed', error: message, completedAt: new Date() } })
    .catch(() => {})
}

function buildPrTitle(mission: string): string {
  const firstLine = mission.split('\n')[0].trim()
  const clipped = firstLine.length > 100 ? `${firstLine.slice(0, 97)}...` : firstLine
  return `Polaris Teams: ${clipped || 'code-run'}`
}

/** C1 git lifecycle around runTeam. Throws only for setup failures (so the job is
 *  marked failed); teardown failures are recorded but don't crash the job. */
async function runWithRepo(sandbox: Sandbox, runId: string, repoUrl: string, baseBranch: string | null): Promise<void> {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    await failRun(runId, 'GITHUB_TOKEN não configurada no worker — code-runs com repositório precisam dela')
    return
  }
  const base = baseBranch || 'main'
  const branch = `polaris/run-${runId}`

  // SETUP — clone + branch. Failure here means the run can't start.
  // setupRepo returns the EFFECTIVE base (the repo's real default if `base` is absent).
  let effectiveBase = base
  try {
    const setup = await setupRepo(sandbox, {
      repoUrl, token, branch, base, workdir: WORKDIR, authorName: AUTHOR_NAME, authorEmail: AUTHOR_EMAIL,
    })
    effectiveBase = setup.base
  } catch (e) {
    await failRun(runId, `Setup do repositório falhou: ${(e as Error)?.message ?? e}`)
    return
  }
  await prisma.teamRun
    .update({ where: { id: runId }, data: { sandboxId: sandbox.id, branch, baseBranch: effectiveBase } })
    .catch(() => {})

  // EXECUTION — agents edit files inside the repo dir; coordinator unchanged.
  // Share ONE store so the code-agent can stream partial artifacts mid-loop (C2.1).
  const store = createPrismaTeamStore()
  const codeChat = createCodeChatFn(sandbox, baseChat, { workdir: WORKDIR, store })
  await runTeam(runId, { store, chat: codeChat })

  // TEARDOWN — commit/push/PR only if the run completed and produced a diff.
  const finished = await prisma.teamRun.findUnique({
    where: { id: runId }, select: { status: true, output: true, mission: true },
  })
  if (finished?.status !== 'completed') return

  try {
    const result = await commitAndPush(sandbox, {
      repoUrl, token, branch, base: effectiveBase, workdir: WORKDIR, message: finished.output || finished.mission,
    })
    if (!result.hasChanges) {
      await prisma.teamRun
        .update({ where: { id: runId }, data: { changedFiles: [] as unknown as Prisma.InputJsonValue } })
        .catch(() => {})
      return
    }
    const tasks = await prisma.teamTask.findMany({
      where: { runId }, select: { title: true, status: true }, orderBy: { position: 'asc' },
    })
    const pr = await openPullRequest({
      repoUrl, token, head: branch, base: effectiveBase,
      title: buildPrTitle(finished.mission),
      body: buildPrBody(finished.mission, tasks, result.changedFiles),
      draft: true,
    })
    await prisma.teamRun.update({
      where: { id: runId },
      data: {
        commitSha: result.commitSha,
        prUrl: pr.prUrl,
        prNumber: pr.prNumber,
        changedFiles: result.changedFiles as unknown as Prisma.InputJsonValue,
      },
    })
  } catch (e) {
    // The work itself is done (status stays 'completed'); record the delivery error.
    const msg = `Entrega git falhou: ${(e as Error)?.message ?? e}`
    console.error(`[worker] ${runId}: ${msg}`)
    await prisma.teamRun.update({ where: { id: runId }, data: { error: msg } }).catch(() => {})
  }
}

const worker = new Worker<CodeRunJob>(
  CODE_RUN_QUEUE,
  async (job: Job<CodeRunJob>) => {
    const { runId } = job.data
    console.log(`[worker] starting code-run ${runId}`)
    const run = await prisma.teamRun.findUnique({
      where: { id: runId }, select: { repoUrl: true, baseBranch: true },
    })
    const sandbox = await getSandboxProvider().create()
    try {
      if (run?.repoUrl) {
        await runWithRepo(sandbox, runId, run.repoUrl, run.baseBranch)
      } else {
        // C0 path: no repo — just run shell in a sandbox.
        await prisma.teamRun
          .update({ where: { id: runId }, data: { sandboxId: sandbox.id } })
          .catch(() => {}) // best-effort metadata write
        const store = createPrismaTeamStore()
        const codeChat = createCodeChatFn(sandbox, baseChat, { store })
        await runTeam(runId, { store, chat: codeChat })
      }
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
