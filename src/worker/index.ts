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
import { runTeamByTopology } from '@/lib/orchestration/team/team-executor'
import { createPrismaTeamStore } from '@/lib/orchestration/team/team-store'
import { createCodeChatFn } from '@/lib/orchestration/team/code-agent'
import { toCliMcpDescriptor, type CliMcpServerDescriptor } from '@/lib/ai/cli-tool-flags'
import { withUsageTracking } from '@/lib/orchestration/team/member-usage-recorder'
import { chatWithAgent } from '@/lib/ai/groq'
import { primaryClaudeToken, loadClaudeTokens } from '@/lib/ai/claude-token-pool'
import { getSandboxProvider } from '@/lib/sandbox'
import type { Sandbox } from '@/lib/sandbox/types'
import { setupRepo, commitAndPush, openPullRequest, buildPrBody, captureWorkingDiff } from '@/lib/git/repo-lifecycle'
import { planGitDelivery } from '@/lib/git/git-delivery-plan'
import { dispatchTeamOutputs } from '@/lib/orchestration/team/team-outputs'

const concurrency = Number(process.env.CODE_RUN_CONCURRENCY ?? 2)

// Absolute path inside the E2B sandbox where the repo is cloned (home of the default user).
const WORKDIR = '/home/user/repo'
const AUTHOR_NAME = process.env.GIT_AUTHOR_NAME ?? 'Polaris Teams'
const AUTHOR_EMAIL = process.env.GIT_AUTHOR_EMAIL ?? 'polaris@polarisia.com.br'

// Option B: subscription token for running claude-* members natively inside the
// sandbox. Threaded into the code-agent; if absent, claude-* workers fall back to
// the (broken-for-CLI) @RUN proxy.
// Pool-aware: first token of the pool (or the single env token). The actual
// per-task rotation happens inside the code-agent via withClaudeTokenFailover;
// this just seeds the gate/threading so claude-* workers stay enabled.
const CLAUDE_OAUTH_TOKEN = primaryClaudeToken()
// Sandbox lifetime — agentic CLI sessions outlast the E2B default (~5 min).
const SANDBOX_TIMEOUT_MS = Number(process.env.SANDBOX_TIMEOUT_MS ?? 15 * 60_000)

// S1.3 (Teams V2.1 — Tema A'): DB-backed resolver injected into the code-agent so the
// Claude-CLI-in-sandbox path can honor a member's `mcpAllowlist` via --mcp-config. Only
// active HTTP/SSE MCP servers (the schema's only transports) are reachable from the
// sandbox. Best-effort: a failure yields [] (no MCP config; writes still preserved).
async function resolveAgentMcpServers(agentId: string): Promise<CliMcpServerDescriptor[]> {
  try {
    const rows = await prisma.agentMcpServer.findMany({
      where: { agentId, enabled: true },
      include: { mcpServer: true },
    })
    return rows
      .filter(r => r.mcpServer?.status === 'active')
      .map(r => toCliMcpDescriptor({
        amsId: r.id,
        name: r.mcpServer.name,
        url: r.mcpServer.url,
        transport: r.mcpServer.transport,
        headers: (r.mcpServer.headers as Record<string, unknown>) ?? null,
      }))
  } catch {
    return []
  }
}
// Custom E2B template (with claude/git/node pre-installed); undefined → provider base.
const SANDBOX_TEMPLATE = process.env.SANDBOX_TEMPLATE || undefined

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
async function runWithRepo(sandbox: Sandbox, runId: string, repoUrl: string, baseBranch: string | null, gitMode: string | null): Promise<void> {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    await failRun(runId, 'GITHUB_TOKEN não configurada no worker — code-runs com repositório precisam dela')
    return
  }
  const base = baseBranch || 'main'
  // S3.1: single source of truth for branch + open-PR. 'pr' (default/legado) →
  // working branch + draft PR; 'direct' → commit straight to the base, no PR.
  const plan = planGitDelivery(gitMode, { runId, base })

  // SETUP — clone + branch. Failure here means the run can't start.
  // setupRepo returns the EFFECTIVE base (the repo's real default if `base` is absent).
  // In direct mode plan.branch === base → setupRepo stays on the cloned base (no new branch).
  let effectiveBase = base
  try {
    const setup = await setupRepo(sandbox, {
      repoUrl, token, branch: plan.branch, base, workdir: WORKDIR, authorName: AUTHOR_NAME, authorEmail: AUTHOR_EMAIL,
    })
    effectiveBase = setup.base
  } catch (e) {
    await failRun(runId, `Setup do repositório falhou: ${(e as Error)?.message ?? e}`)
    return
  }
  // Direct mode: the working branch follows the EFFECTIVE base (the repo's real
  // default may differ from the requested base). PR mode: the run branch.
  const branch = plan.openPr ? plan.branch : effectiveBase
  await prisma.teamRun
    .update({ where: { id: runId }, data: { sandboxId: sandbox.id, branch, baseBranch: effectiveBase } })
    .catch(() => {})

  // EXECUTION — agents edit files inside the repo dir; coordinator unchanged.
  // Share ONE store so the code-agent can stream partial artifacts mid-loop (C2.1).
  // C3: inject getTaskDiff so the reviewer sees the real working-tree diff (vs base).
  const store = createPrismaTeamStore()
  const codeChat = withUsageTracking(createCodeChatFn(sandbox, baseChat, { workdir: WORKDIR, store, claudeToken: CLAUDE_OAUTH_TOKEN, resolveMcpServers: resolveAgentMcpServers }))
  await runTeamByTopology(runId, {
    store,
    chat: codeChat,
    getTaskDiff: () => captureWorkingDiff(sandbox, { workdir: WORKDIR, base: effectiveBase }),
  })

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
    // Direct mode (S3.1): the push already landed on the base. Persist the diff +
    // commit for the delivery panel, but DON'T open a PR (prUrl/prNumber stay null).
    if (!plan.openPr) {
      await prisma.teamRun.update({
        where: { id: runId },
        data: {
          commitSha: result.commitSha,
          changedFiles: result.changedFiles as unknown as Prisma.InputJsonValue,
        },
      })
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
      where: { id: runId }, select: { repoUrl: true, baseBranch: true, gitMode: true },
    })
    const sandbox = await getSandboxProvider().create({ timeoutMs: SANDBOX_TIMEOUT_MS, templateId: SANDBOX_TEMPLATE })
    try {
      if (run?.repoUrl) {
        await runWithRepo(sandbox, runId, run.repoUrl, run.baseBranch, run.gitMode)
      } else {
        // C0 path: no repo — just run shell in a sandbox.
        await prisma.teamRun
          .update({ where: { id: runId }, data: { sandboxId: sandbox.id } })
          .catch(() => {}) // best-effort metadata write
        const store = createPrismaTeamStore()
        const codeChat = withUsageTracking(createCodeChatFn(sandbox, baseChat, { store, claudeToken: CLAUDE_OAUTH_TOKEN, resolveMcpServers: resolveAgentMcpServers }))
        await runTeamByTopology(runId, { store, chat: codeChat })
      }
      await dispatchTeamOutputs(runId)
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
console.log(`[worker] claude token pool: ${loadClaudeTokens().length} conta(s) carregada(s) (>=2 habilita failover)`)
