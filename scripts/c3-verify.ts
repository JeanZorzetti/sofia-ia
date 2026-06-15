// scripts/c3-verify.ts
// Local verification for the C3 code-review-with-diff slice (no DB / no network / no real git).
// Run: npx tsx scripts/c3-verify.ts
import assert from 'node:assert/strict'
import { captureWorkingDiff, type ChangedFile } from '../src/lib/git/repo-lifecycle'
import { buildReviewPrompt, renderDiffForReview } from '../src/lib/orchestration/team/team-prompts'
import { runTeam } from '../src/lib/orchestration/team/team-coordinator'
import type { ChatFn, ChatResult, TaskRow, MessageRow, TaskStatus } from '../src/lib/orchestration/team/team-types'
import type { TeamStore, LoadedRun, CreateTaskInput, UpdateTaskInput, AddMessageInput } from '../src/lib/orchestration/team/team-store'
import type { Sandbox, CommandResult, ExecOptions } from '../src/lib/sandbox/types'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

// ── fake sandbox (mirror c2-verify) ────────────────────────────────
type Responder = (cmd: string) => Partial<CommandResult>
function scriptedSandbox(responder: Responder = () => ({})): Sandbox & { calls: { cmd: string; opts?: ExecOptions }[] } {
  const calls: { cmd: string; opts?: ExecOptions }[] = []
  return {
    id: 'sbx-test', calls,
    async exec(cmd: string, opts?: ExecOptions): Promise<CommandResult> {
      calls.push({ cmd, opts })
      const r = responder(cmd)
      return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', exitCode: r.exitCode ?? 0, ms: 1 }
    },
    async writeFile() {},
    async close() {},
  }
}

const SINGLE_DIFF = [
  'diff --git a/src/a.ts b/src/a.ts',
  'index 1..2 100644',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -1 +1 @@',
  '-old',
  '+new',
].join('\n')

const sampleDiff: ChangedFile[] = [
  { status: 'M', path: 'src/a.ts', patch: 'diff --git a/src/a.ts b/src/a.ts\n@@ -1 +1 @@\n-old\n+new' },
  { status: 'A', path: 'logo.png', binary: true },
  { status: 'M', path: 'big.txt', truncated: true },
]

// ── renderDiffForReview ────────────────────────────────────────────
console.log('renderDiffForReview')
{
  assert.equal(renderDiffForReview([]), '')
  ok('empty → empty string (caller falls back to text-only)')
  const r = renderDiffForReview(sampleDiff)
  assert.ok(r.includes('### M src/a.ts'))
  assert.ok(r.includes('```diff') && r.includes('+new'))
  ok('text file → header + fenced patch')
  assert.ok(r.includes('### A logo.png') && r.includes('binário'))
  ok('binary file → flagged, no patch dump')
  assert.ok(r.includes('### M big.txt') && r.includes('omitido'))
  ok('over-budget file (truncated, no patch) → flagged as omitido')
}

// ── buildReviewPrompt ──────────────────────────────────────────────
console.log('buildReviewPrompt')
const baseTask: TaskRow = {
  id: 't1', title: 'Implementar X', body: 'critério', status: 'review',
  assigneeId: 'w1', result: 'feito', reviewNote: null, retryCount: 0, position: 0,
}
{
  // No diff → byte-identical to the pre-C3 prompt (chat-runs / C0 unchanged).
  const expected = [
    'Você é o REVIEWER do time. Avalie criticamente o trabalho do Worker.',
    '',
    '## Tarefa\nImplementar X',
    '\ncritério',
    '',
    '## Resultado entregue pelo Worker\nfeito',
    '',
    'Responda SOMENTE com uma diretiva:',
    '@APPROVE  — se o resultado cumpre a tarefa',
    '@REJECT motivo objetivo  — se precisa ser refeito',
  ].join('\n')
  assert.equal(buildReviewPrompt(baseTask), expected)
  ok('no diff → output is byte-identical to the legacy prompt')
  assert.equal(buildReviewPrompt(baseTask, []), expected)
  ok('empty diff array → same as no diff (additive only)')
}
{
  const p = buildReviewPrompt(baseTask, sampleDiff)
  assert.ok(p.includes('## Resultado entregue pelo Worker\nfeito'))
  assert.ok(p.includes('## Diff das mudanças'))
  assert.ok(p.includes('+new'), 'real patch content reaches the reviewer')
  assert.ok(p.includes('Avalie o DIFF acima'))
  assert.ok(p.includes('@APPROVE') && p.includes('@REJECT'))
  ok('with diff → diff block injected, directive contract preserved')
}

async function main() {
  // ── captureWorkingDiff ───────────────────────────────────────────
  console.log('captureWorkingDiff')
  {
    // happy path: diffs the BASE (working tree), attaches per-file patch
    const sbx = scriptedSandbox(cmd => {
      if (cmd.includes('diff --name-status')) return { stdout: 'M\tsrc/a.ts' }
      if (cmd.includes(' diff ')) return { stdout: SINGLE_DIFF }
      return {}
    })
    const out = await captureWorkingDiff(sbx, { workdir: '/w', base: 'main' })
    assert.equal(out.length, 1)
    assert.equal(out[0].path, 'src/a.ts')
    assert.ok(out[0].patch?.includes('+new'), 'per-file patch attached')
    // working-tree diff vs base: NO `origin/` prefix, NO `..HEAD` range
    const nameStatusCall = sbx.calls.find(c => c.cmd.includes('diff --name-status'))!.cmd
    assert.ok(nameStatusCall.includes("'main'"), 'diffs the base ref')
    assert.ok(!nameStatusCall.includes('origin/'), 'NOT origin/<base>')
    assert.ok(!nameStatusCall.includes('..HEAD'), 'NOT a committed range — it is the working tree')
    ok('happy path → name-status + full diff vs base, patch attached')
  }
  {
    // name-status fails → [] (best-effort, never blocks the review)
    const sbx = scriptedSandbox(cmd => {
      if (cmd.includes('diff --name-status')) return { exitCode: 1, stderr: 'boom' }
      return {}
    })
    assert.deepEqual(await captureWorkingDiff(sbx, { workdir: '/w', base: 'main' }), [])
    ok('name-status exitCode≠0 → [] (best-effort)')
  }
  {
    // no changes → [] (skips the full diff call entirely)
    const sbx = scriptedSandbox(cmd => {
      if (cmd.includes('diff --name-status')) return { stdout: '' }
      return {}
    })
    const out = await captureWorkingDiff(sbx, { workdir: '/w', base: 'main' })
    assert.deepEqual(out, [])
    assert.ok(!sbx.calls.some(c => c.cmd.includes(' diff ') && !c.cmd.includes('--name-status')),
      'no full-diff call when there are no changed files')
    ok('clean working tree → [] without a wasted full-diff call')
  }
  {
    // full diff fails → keep the name-only list (still useful to the reviewer)
    const sbx = scriptedSandbox(cmd => {
      if (cmd.includes('diff --name-status')) return { stdout: 'M\tsrc/a.ts' }
      if (cmd.includes(' diff ')) return { exitCode: 1, stderr: 'boom' }
      return {}
    })
    const out = await captureWorkingDiff(sbx, { workdir: '/w', base: 'main' })
    assert.deepEqual(out, [{ status: 'M', path: 'src/a.ts' }])
    ok('full-diff exitCode≠0 → name-only list kept (no patch, no crash)')
  }
  {
    // exec throws → [] (exception swallowed)
    const sbx: Sandbox = {
      id: 'x', async exec() { throw new Error('sandbox gone') }, async writeFile() {}, async close() {},
    }
    assert.deepEqual(await captureWorkingDiff(sbx, { workdir: '/w', base: 'main' }), [])
    ok('exec throws → [] (exception swallowed)')
  }

  // ── coordinator review wiring (getTaskDiff injection) ────────────
  console.log('coordinator: getTaskDiff injection')
  await coordinatorTests()

  console.log(`\n✅ all ${passed} assertions passed`)
}

// ── minimal in-memory TeamStore for runTeam ─────────────────────────
function makeStore(): TeamStore & { tasksById: Map<string, TaskRow & { artifacts?: unknown }> } {
  let runStatus: string = 'pending'
  const tasksById = new Map<string, TaskRow & { artifacts?: unknown }>()
  const messages: MessageRow[] = []
  let seq = 0
  const loaded: LoadedRun = {
    runId: 'run1', teamId: 'team1', mission: 'fazer X',
    config: { maxTurns: 6, retryCap: 2 },
    members: [
      { id: 'm-lead', agentId: 'a-lead', agentName: 'Lead', role: 'lead', model: null, effort: null },
      { id: 'm-work', agentId: 'a-work', agentName: 'Worker', role: 'worker', model: null, effort: null },
      { id: 'm-rev', agentId: 'a-rev', agentName: 'Reviewer', role: 'reviewer', model: null, effort: null },
    ],
  }
  return {
    tasksById,
    async loadRun() { return loaded },
    async getRunStatus() { return runStatus as never },
    async setRunRunning() { runStatus = 'running' },
    async finishRun(_id, data) { runStatus = data.status },
    async listTasks() {
      return [...tasksById.values()].map(({ artifacts: _a, ...t }) => t).sort((a, b) => a.position - b.position)
    },
    async createTask(_runId: string, data: CreateTaskInput) {
      const t: TaskRow & { artifacts?: unknown } = {
        id: `task-${++seq}`, title: data.title, body: data.body ?? null,
        status: data.status ?? 'todo', assigneeId: data.assigneeId ?? null,
        result: null, reviewNote: null, retryCount: 0, position: tasksById.size,
      }
      tasksById.set(t.id, t)
      const { artifacts: _a, ...row } = t
      return row
    },
    async updateTask(taskId: string, data: UpdateTaskInput) {
      const t = tasksById.get(taskId)
      if (!t) return
      if (data.status !== undefined) t.status = data.status as TaskStatus
      if (data.result !== undefined) t.result = data.result
      if (data.reviewNote !== undefined) t.reviewNote = data.reviewNote
      if (data.retryCount !== undefined) t.retryCount = data.retryCount
      if (data.artifacts !== undefined) {
        const prev = (t.artifacts && typeof t.artifacts === 'object' ? t.artifacts : {}) as Record<string, unknown>
        t.artifacts = { ...prev, ...data.artifacts }
      }
    },
    async listMessages() { return messages },
    async addMessage(_runId: string, data: AddMessageInput) {
      messages.push({
        id: `msg-${messages.length}`, fromMemberId: data.fromMemberId ?? null,
        toMemberId: data.toMemberId ?? null, summary: data.summary ?? null,
        content: data.content, kind: data.kind, taskId: data.taskId ?? null,
      })
    },
  }
}

// A chat that: Lead emits one @TASK, Worker delivers, Reviewer approves, Lead consolidates.
// Records every reviewer prompt so we can assert what the reviewer saw.
function makeChat(reviewerPrompts: string[]): ChatFn {
  return async (agentId, messages): Promise<ChatResult> => {
    const content = messages[messages.length - 1]?.content ?? ''
    if (agentId === 'a-lead') {
      if (content.includes('Consolide')) return { message: 'Entrega final', model: 'fake' }
      // planning turn — only emit a task the first time (board empty)
      if (content.includes('Board vazio')) {
        return { message: '@TASK [worker:Worker] Fazer X\n  detalhes', model: 'fake' }
      }
      return { message: '@DONE tudo certo', model: 'fake' }
    }
    if (agentId === 'a-work') return { message: 'resultado do worker', model: 'fake' }
    if (agentId === 'a-rev') { reviewerPrompts.push(content); return { message: '@APPROVE', model: 'fake' } }
    return { message: '', model: 'fake' }
  }
}

async function coordinatorTests() {
  {
    // getTaskDiff provided → reviewer prompt carries the real diff; persisted to artifacts.reviewDiff
    const store = makeStore()
    const reviewerPrompts: string[] = []
    let diffCalls = 0
    await runTeam('run1', {
      store,
      chat: makeChat(reviewerPrompts),
      getTaskDiff: async () => { diffCalls++; return sampleDiff },
    })
    assert.ok(diffCalls >= 1, 'getTaskDiff was called during review')
    assert.ok(reviewerPrompts.length >= 1, 'reviewer ran')
    assert.ok(reviewerPrompts[0].includes('## Diff das mudanças'), 'reviewer saw the diff block')
    assert.ok(reviewerPrompts[0].includes('+new'), 'reviewer saw real patch content')
    const reviewed = [...store.tasksById.values()].find(t => t.artifacts)
    assert.ok(reviewed, 'a task got artifacts persisted')
    const art = reviewed!.artifacts as { reviewDiff?: unknown[] }
    assert.ok(Array.isArray(art.reviewDiff) && art.reviewDiff.length === 3, 'reviewDiff persisted to artifacts')
    ok('getTaskDiff provided → diff reaches reviewer prompt + persisted to artifacts.reviewDiff')
  }
  {
    // getTaskDiff absent → reviewer prompt is text-only (legacy behavior intact)
    const store = makeStore()
    const reviewerPrompts: string[] = []
    await runTeam('run1', { store, chat: makeChat(reviewerPrompts) })
    assert.ok(reviewerPrompts.length >= 1, 'reviewer ran')
    assert.ok(!reviewerPrompts[0].includes('## Diff das mudanças'), 'no diff block without getTaskDiff')
    assert.ok(reviewerPrompts[0].includes('## Resultado entregue pelo Worker'), 'text review intact')
    const anyArtifacts = [...store.tasksById.values()].some(t => t.artifacts)
    assert.ok(!anyArtifacts, 'no reviewDiff written when getTaskDiff is absent')
    ok('getTaskDiff absent → text-only review, no artifacts written (chat-run/C0 intact)')
  }
  {
    // getTaskDiff rejects → review still proceeds (best-effort, []), no diff block
    const store = makeStore()
    const reviewerPrompts: string[] = []
    await runTeam('run1', {
      store,
      chat: makeChat(reviewerPrompts),
      getTaskDiff: async () => { throw new Error('diff blew up') },
    })
    assert.ok(reviewerPrompts.length >= 1, 'reviewer still ran despite getTaskDiff throwing')
    assert.ok(!reviewerPrompts[0].includes('## Diff das mudanças'), 'fell back to text-only on diff failure')
    ok('getTaskDiff rejects → caught, review proceeds text-only (gate never blocked)')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
