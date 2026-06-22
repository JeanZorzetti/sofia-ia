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
import { materializeRunAttachmentsToSandbox } from '@/lib/orchestration/team/materialize-attachments'
import { toCliMcpDescriptor, type CliMcpServerDescriptor } from '@/lib/ai/cli-tool-flags'
import { withUsageTracking } from '@/lib/orchestration/team/member-usage-recorder'
import { chatWithAgent } from '@/lib/ai/groq'
import { primaryClaudeToken, loadClaudeTokens } from '@/lib/ai/claude-token-pool'
import { getSandboxProvider } from '@/lib/sandbox'
import { sweepVpsRunDirs } from '@/lib/sandbox/vps-local'
import type { Sandbox } from '@/lib/sandbox/types'
import { startSandboxHeartbeat } from '@/lib/sandbox/heartbeat'
import { setupRepo, commitAndPush, openPullRequest, buildPrBody, captureWorkingDiff } from '@/lib/git/repo-lifecycle'
import { planGitDelivery } from '@/lib/git/git-delivery-plan'
import { dispatchTeamOutputs } from '@/lib/orchestration/team/team-outputs'
import { detectPreviewPlan, deriveProjectDir, readPreviewOverride, startPreviewServer, PREVIEW_TTL_MS, PREVIEW_SANDBOX_MARGIN_MS } from '@/lib/orchestration/team/preview-server'

const concurrency = Number(process.env.CODE_RUN_CONCURRENCY ?? 2)

// The repo workdir is derived PER RUN from `sandbox.rootDir` (003 — VPS executor):
// E2B omits rootDir → legacy '/home/user/repo' (byte-identical); VpsLocal →
// '${VPS_RUNS_DIR}/<id>/repo'. Computed after the sandbox is created/connected and
// threaded into the run helpers — no module-level WORKDIR constant anymore.
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
async function runWithRepo(sandbox: Sandbox, workdir: string, runId: string, repoUrl: string, baseBranch: string | null, gitMode: string | null): Promise<void> {
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
      repoUrl, token, branch: plan.branch, base, workdir, authorName: AUTHOR_NAME, authorEmail: AUTHOR_EMAIL,
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
  const codeChat = withUsageTracking(createCodeChatFn(sandbox, baseChat, { workdir, store, claudeToken: CLAUDE_OAUTH_TOKEN, resolveMcpServers: resolveAgentMcpServers, syncAttachments: () => materializeRunAttachmentsToSandbox(sandbox, runId) }))
  await runTeamByTopology(runId, {
    store,
    chat: codeChat,
    getTaskDiff: () => captureWorkingDiff(sandbox, { workdir, base: effectiveBase }),
  })

  // TEARDOWN — commit/push/PR only if the run completed and produced a diff.
  const finished = await prisma.teamRun.findUnique({
    where: { id: runId }, select: { status: true, output: true, mission: true },
  })
  if (finished?.status !== 'completed') return

  try {
    const result = await commitAndPush(sandbox, {
      repoUrl, token, branch, base: effectiveBase, workdir, message: finished.output || finished.mission,
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

/** Preview mode: after a successful repo-bound code-run, boot the project's dev server
 *  inside the SAME sandbox and expose a public URL, then KEEP THE SANDBOX ALIVE (the
 *  caller skips close()). Returns true when the preview went live (→ keep-alive). Any
 *  failure here is swallowed: the run already delivered its diff/PR. The sandbox's
 *  extended timeout is the hard cost ceiling even if the reaper never runs. */
async function startRunPreview(sandbox: Sandbox, workdir: string, runId: string): Promise<boolean> {
  const run = await prisma.teamRun.findUnique({
    where: { id: runId },
    select: { status: true, changedFiles: true, team: { select: { config: true } } },
  })
  if (run?.status !== 'completed') return false
  try {
    await prisma.teamRun.update({ where: { id: runId }, data: { previewStatus: 'starting', previewError: null } }).catch(() => {})
    // The site may live in a subdir (agents often scaffold into e.g. `teste 2/`); derive it
    // from the run's changed files. The dir may contain spaces — exec `cwd` handles that.
    const projectDir = deriveProjectDir(run.changedFiles as Array<{ path: string }> | null)
    const previewWorkdir = projectDir ? `${workdir}/${projectDir}` : workdir
    const pkg = await sandbox.exec('cat package.json', { cwd: previewWorkdir, timeoutMs: 8_000 })
    const idx = await sandbox.exec('test -f index.html && echo yes || echo no', { cwd: previewWorkdir, timeoutMs: 8_000 })
    const plan = detectPreviewPlan(
      pkg.exitCode === 0 ? pkg.stdout : null,
      idx.stdout.trim() === 'yes',
      readPreviewOverride(run.team?.config),
    )
    const { url, port } = await startPreviewServer(sandbox, { workdir: previewWorkdir, plan })
    await sandbox.setTimeout(PREVIEW_TTL_MS + PREVIEW_SANDBOX_MARGIN_MS).catch(() => {})
    await prisma.teamRun.update({
      where: { id: runId },
      data: {
        previewStatus: 'live',
        previewUrl: url,
        previewPort: port,
        previewExpiresAt: new Date(Date.now() + PREVIEW_TTL_MS),
      },
    })
    console.log(`[worker] ${runId} preview live at ${url} (dir=${projectDir || '.'}, kind=${plan.kind})`)
    return true
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e)
    console.error(`[worker] ${runId} preview falhou:`, msg)
    await prisma.teamRun
      .update({ where: { id: runId }, data: { previewStatus: 'failed', previewError: msg.slice(0, 1000) } })
      .catch(() => {})
    return false
  }
}

/** Continuation (Lovable iteration): the sandbox already has the repo on `branch` with the
 *  parent's committed work and a running preview. SKIP the clone — run the team in the
 *  existing workdir and commit the incremental diff to the SAME branch (the PR, if any,
 *  auto-updates on push; no new PR is opened). Coordinator INTACT. */
async function continueWithRepo(sandbox: Sandbox, workdir: string, runId: string, repoUrl: string, branch: string, base: string): Promise<void> {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    await failRun(runId, 'GITHUB_TOKEN não configurada no worker — code-runs com repositório precisam dela')
    return
  }
  await prisma.teamRun.update({ where: { id: runId }, data: { sandboxId: sandbox.id } }).catch(() => {})

  const store = createPrismaTeamStore()
  const codeChat = withUsageTracking(createCodeChatFn(sandbox, baseChat, { workdir, store, claudeToken: CLAUDE_OAUTH_TOKEN, resolveMcpServers: resolveAgentMcpServers, syncAttachments: () => materializeRunAttachmentsToSandbox(sandbox, runId) }))
  await runTeamByTopology(runId, {
    store,
    chat: codeChat,
    getTaskDiff: () => captureWorkingDiff(sandbox, { workdir, base }),
  })

  const finished = await prisma.teamRun.findUnique({ where: { id: runId }, select: { status: true, output: true, mission: true } })
  if (finished?.status !== 'completed') return
  try {
    const result = await commitAndPush(sandbox, {
      repoUrl, token, branch, base, workdir, message: finished.output || finished.mission,
    })
    await prisma.teamRun.update({
      where: { id: runId },
      data: {
        ...(result.hasChanges ? { commitSha: result.commitSha } : {}),
        changedFiles: (result.hasChanges ? result.changedFiles : []) as unknown as Prisma.InputJsonValue,
      },
    })
  } catch (e) {
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
      where: { id: runId }, select: { repoUrl: true, baseBranch: true, gitMode: true, previewEnabled: true, parentRunId: true, branch: true, sandboxId: true },
    })
    // Continuation reuses the parent's still-alive sandbox (no clone). If the reconnect fails
    // (TTL elapsed between submit and pickup), fail clearly — the UI gates the follow-up on a
    // live preview, so this is rare.
    const isContinuation = !!(run?.parentRunId && run.sandboxId && run.repoUrl)
    let sandbox: Sandbox
    if (isContinuation) {
      try {
        sandbox = await getSandboxProvider().connect(run!.sandboxId!)
      } catch (e) {
        await failRun(runId, `A sessão de preview expirou antes da continuação — dispare uma nova missão (${(e as Error)?.message ?? e})`)
        return
      }
    } else {
      sandbox = await getSandboxProvider().create({ timeoutMs: SANDBOX_TIMEOUT_MS, templateId: SANDBOX_TEMPLATE })
    }
    // Per-run repo workdir (003): E2B → '/home/user/repo' (byte-identical); VpsLocal →
    // '${VPS_RUNS_DIR}/<id>/repo'. The C0 (no-repo) path instead runs in `sandbox.rootDir`
    // itself (undefined for E2B → legacy sandbox cwd; the isolated run dir for VpsLocal).
    const workdir = `${sandbox.rootDir ?? '/home/user'}/repo`
    // Keep the sandbox alive for the WHOLE run. The sandbox is born with a fixed lifetime
    // (SANDBOX_TIMEOUT_MS); a run that outlasts it would get the sandbox killed mid-flight
    // and the git teardown would fail with "Sandbox is probably not running anymore". The
    // heartbeat renews the lifetime on each tick; SANDBOX_TIMEOUT_MS stays the cost ceiling
    // if the worker dies (ticks stop → sandbox self-destructs).
    const heartbeat = startSandboxHeartbeat(sandbox, {
      ttlMs: SANDBOX_TIMEOUT_MS,
      onError: e => console.error(`[worker] ${runId} heartbeat falhou:`, (e as Error)?.message ?? e),
    })
    let keepAlive = false
    try {
      if (isContinuation) {
        await continueWithRepo(sandbox, workdir, runId, run!.repoUrl!, run!.branch || run!.baseBranch || 'main', run!.baseBranch || 'main')
      } else if (run?.repoUrl) {
        await runWithRepo(sandbox, workdir, runId, run.repoUrl, run.baseBranch, run.gitMode)
      } else {
        // C0 path: no repo — just run shell in a sandbox. Use the sandbox root as cwd
        // (undefined for E2B → legacy default; the isolated run dir for VpsLocal so the
        // agent never runs in the worker's own process cwd).
        await prisma.teamRun
          .update({ where: { id: runId }, data: { sandboxId: sandbox.id } })
          .catch(() => {}) // best-effort metadata write
        const store = createPrismaTeamStore()
        const codeChat = withUsageTracking(createCodeChatFn(sandbox, baseChat, { workdir: sandbox.rootDir, store, claudeToken: CLAUDE_OAUTH_TOKEN, resolveMcpServers: resolveAgentMcpServers, syncAttachments: () => materializeRunAttachmentsToSandbox(sandbox, runId) }))
        await runTeamByTopology(runId, { store, chat: codeChat })
      }
      await dispatchTeamOutputs(runId)
      // Work delivered — stop the heartbeat so the preview (if any) governs the sandbox
      // lifetime via its own setTimeout; otherwise the sandbox is torn down below.
      heartbeat.stop()
      // Preview only makes sense for a repo-bound project (something to serve).
      if (run?.repoUrl && run.previewEnabled) {
        keepAlive = await startRunPreview(sandbox, workdir, runId)
      }
    } finally {
      heartbeat.stop() // idempotent — also covers the error path
      // Keep the sandbox alive when a preview is live; otherwise always tear it down
      // (avoids leaked/charged sandboxes).
      if (!keepAlive) await sandbox.close().catch(() => {})
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

// Boot sweep (003 — FR-012): when running the self-hosted executor, remove run dirs
// left behind by a crashed/redeployed worker. Protects the dirs of runs the DB still
// considers active (long missions), and only touches dirs older than the age threshold.
// Best-effort: a failure here never blocks the worker from coming online.
if ((process.env.SANDBOX_PROVIDER ?? 'e2b').toLowerCase() === 'vps-local') {
  void (async () => {
    try {
      const activeRuns = await prisma.teamRun.findMany({
        where: { status: { in: ['pending', 'running'] }, sandboxId: { not: null } },
        select: { sandboxId: true },
      })
      const activeIds = new Set(activeRuns.map(r => r.sandboxId).filter((id): id is string => !!id))
      const swept = await sweepVpsRunDirs({ activeIds })
      if (swept.length > 0) console.log(`[worker] boot sweep removeu ${swept.length} dir(s) órfão(s) em VPS_RUNS_DIR`)
    } catch (e) {
      console.error('[worker] boot sweep falhou (ignorado):', (e as Error)?.message ?? e)
    }
  })()
}
