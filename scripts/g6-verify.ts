// scripts/g6-verify.ts
// Local verification for the G6 clarification & escalation slice (no DB / no network).
// Jest can't run on this machine (OneDrive errno -4094), so this script asserts the
// G6 contract via tsx. Run: npx tsx scripts/g6-verify.ts
//
// Four halves:
//   1. parseWorkerOutput  — a Worker that emits `@CLARIFY <pergunta>` asks instead
//      of guessing; any other output is a plain `result` (the unchanged path).
//   2. parseLeadActions   — the Lead answers a pending doubt with `@CLARIFY [#n] resposta`.
//   3. deriveTaskAction   — a `clarify` task routes to the Lead (escalation); all G2
//      cases stay identical. buildTaskPrompt's `allowClarify` is OPT-IN (protects linear).
//   4. E2E (memory-store)  — Worker clarifies → task parks in `clarify` (no result, no
//      review) → Lead answers → task back to `todo` with the answer as feedback →
//      Worker re-executes (sees the answer) → review/done → run completed.
import assert from 'node:assert/strict'
import { parseWorkerOutput, parseLeadActions } from '../src/lib/orchestration/team/team-protocol'
import { deriveTaskAction } from '../src/lib/orchestration/team/team-graph-agenda'
import { buildTaskPrompt, buildLeadContext, buildBoardSnapshot } from '../src/lib/orchestration/team/team-prompts'
import { runTeamGraph } from '../src/lib/orchestration/team/team-graph-coordinator'
import type { ChatFn, ChatResult, MemberCtx, TaskRow, MessageRow, RunStatus } from '../src/lib/orchestration/team/team-types'
import type {
  TeamStore, LoadedRun, CreateTaskInput, UpdateTaskInput, AddMessageInput, FinishRunInput,
} from '../src/lib/orchestration/team/team-store'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

// ── in-memory store (mirrors g2/g3-verify) ──
interface MemState { status: RunStatus; finished?: FinishRunInput; tasks: TaskRow[]; messages: MessageRow[] }
function createMemoryStore(opts: {
  mission: string; members: MemberCtx[]; config?: { maxTurns: number; retryCap: number }
}): { store: TeamStore; state: MemState } {
  const state: MemState = { status: 'pending', tasks: [], messages: [] }
  let taskSeq = 0, msgSeq = 0
  const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))
  const store: TeamStore = {
    async loadRun(): Promise<LoadedRun> {
      return {
        runId: 'run-1', teamId: 'team-1', mission: opts.mission,
        config: opts.config ?? { maxTurns: 6, retryCap: 2 }, members: opts.members,
      }
    },
    async getRunStatus() { return state.status },
    async setRunRunning() { state.status = 'running' },
    async finishRun(_id, data: FinishRunInput) { state.status = data.status; state.finished = data },
    async listTasks() { return clone(state.tasks) },
    async createTask(_id, data: CreateTaskInput) {
      const row: TaskRow = {
        id: `t${++taskSeq}`, title: data.title, body: data.body ?? null,
        status: data.status ?? 'todo', assigneeId: data.assigneeId ?? null,
        result: null, reviewNote: null, retryCount: 0, position: state.tasks.length,
        dependsOn: data.dependsOn ?? [],
      }
      state.tasks.push(row)
      return clone(row)
    },
    async updateTask(id, data: UpdateTaskInput) {
      const t = state.tasks.find(x => x.id === id); if (t) Object.assign(t, data)
    },
    async listMessages() { return clone(state.messages) },
    async addMessage(_id, data: AddMessageInput) {
      state.messages.push({
        id: `m${++msgSeq}`, fromMemberId: data.fromMemberId ?? null,
        toMemberId: data.toMemberId ?? null, summary: data.summary ?? null,
        content: data.content, kind: data.kind, taskId: data.taskId ?? null,
      })
    },
  }
  return { store, state }
}

const members: MemberCtx[] = [
  { id: 'L', agentId: 'al', agentName: 'Lia', role: 'lead', model: null, effort: null },
  { id: 'W', agentId: 'aw', agentName: 'Ana', role: 'worker', model: null, effort: null },
  { id: 'R', agentId: 'ar', agentName: 'Rex', role: 'reviewer', model: null, effort: null },
]
const reply = (message: string): ChatResult => ({ message, model: 'mock', usage: { total_tokens: 10 } })
function scriptedChat(script: Record<string, string[]>): ChatFn {
  const idx: Record<string, number> = {}
  return async (agentId) => {
    const queue = script[agentId] ?? []
    const i = idx[agentId] ?? 0; idx[agentId] = i + 1
    return reply(queue[Math.min(i, queue.length - 1)] ?? '@DONE vazio')
  }
}

// build a TaskRow with overrides
function mk(id: string, status: TaskRow['status'], over: Partial<TaskRow> = {}): TaskRow {
  return {
    id, title: id, body: null, status, assigneeId: 'W', result: null,
    reviewNote: null, retryCount: 0, position: 0, dependsOn: [], ...over,
  }
}

async function main() {
  // ── 1. parseWorkerOutput ───────────────────────────────────────────
  console.log('parseWorkerOutput')
  {
    assert.deepEqual(parseWorkerOutput('@CLARIFY Qual é o produto?'), { kind: 'clarify', question: 'Qual é o produto?' })
    ok('@CLARIFY at line start → clarify with the question')
    assert.deepEqual(parseWorkerOutput('Aqui está o resultado completo.'), { kind: 'result' })
    ok('normal output → result')
    assert.deepEqual(
      parseWorkerOutput('Tentei mas faltou contexto.\n@CLARIFY Qual o público-alvo?'),
      { kind: 'clarify', question: 'Qual o público-alvo?' },
    )
    ok('@CLARIFY mid-text (after a newline) is detected')
    assert.equal(parseWorkerOutput('A entrega não tem @CLARIFY no início da linha.').kind, 'result')
    ok('@CLARIFY inline (not at line start) → still result (no false positive)')
    assert.equal(parseWorkerOutput('').kind, 'result')
    ok('empty output → result (regression-safe default)')
  }

  // ── 2. parseLeadActions (clarify answer) ───────────────────────────
  console.log('parseLeadActions (@CLARIFY answer)')
  {
    const a = parseLeadActions('@CLARIFY [#2] O produto é o Compass')
    assert.deepEqual(a, [{ type: 'clarify', display: 2, answer: 'O produto é o Compass' }])
    ok('@CLARIFY [#2] resposta → clarify action with display + answer')

    const mix = parseLeadActions('@TASK [worker:Ana] Fazer X\n@CLARIFY [#1] use azul\n@DONE fim')
    assert.equal(mix.find(x => x.type === 'task')?.title, 'Fazer X'); ok('coexists with @TASK')
    assert.deepEqual(mix.find(x => x.type === 'clarify'), { type: 'clarify', display: 1, answer: 'use azul' })
    ok('clarify parsed alongside @TASK/@DONE')
    assert.ok(mix.some(x => x.type === 'done')); ok('@DONE still parsed in the same block')

    // bare `#n` (no brackets) also resolves; a missing #n is dropped (can't route).
    assert.deepEqual(parseLeadActions('@CLARIFY #3 resposta solta'), [{ type: 'clarify', display: 3, answer: 'resposta solta' }])
    ok('@CLARIFY #3 (no brackets) also parses the display id')
    assert.deepEqual(parseLeadActions('@CLARIFY sem id'), []); ok('@CLARIFY without a #n is dropped (unroutable)')
  }

  // ── 3a. deriveTaskAction — clarify routes to the Lead ──────────────
  console.log('deriveTaskAction (clarify → lead)')
  {
    assert.deepEqual(deriveTaskAction(mk('a', 'clarify'), []), { nextAction: 'clarify', actionOwner: 'lead' })
    ok('clarify → clarify/lead (escalation)')
    // G2 regression: existing statuses unchanged (clarify is mutually exclusive).
    assert.equal(deriveTaskAction(mk('a', 'todo'), []).nextAction, 'execute'); ok('todo still → execute (G2 intact)')
    assert.equal(deriveTaskAction(mk('a', 'review'), []).nextAction, 'review'); ok('review still → review (G2 intact)')
    assert.equal(deriveTaskAction(mk('a', 'done'), []).nextAction, 'terminal'); ok('done still → terminal (G2 intact)')
  }

  // ── 3b. buildTaskPrompt allowClarify is OPT-IN (protects linear) ────
  console.log('buildTaskPrompt (allowClarify opt-in)')
  {
    const t = mk('Validar', 'todo', { title: 'Validar form', body: 'cobrir e-mail' })
    const plain = buildTaskPrompt(t, null)
    assert.ok(!plain.includes('@CLARIFY')); ok('no opts → no @CLARIFY instruction (linear path)')
    assert.equal(plain, buildTaskPrompt(t, null, { allowClarify: false })); ok('allowClarify:false byte-identical to no-opts')
    const clar = buildTaskPrompt(t, null, { allowClarify: true })
    assert.ok(clar.includes('@CLARIFY')); ok('allowClarify:true → @CLARIFY instruction present')
    assert.ok(clar.startsWith(plain.split('\nAo terminar')[0])); ok('allowClarify only APPENDS (prefix unchanged)')
  }

  // ── 3c. Lead snapshot/contract additive (byte-identical without clarify) ──
  console.log('buildLeadContext / buildBoardSnapshot (additive)')
  {
    const todo = mk('t1', 'todo', { title: 'Tarefa A', position: 0 })
    const noClar = buildLeadContext('M', [todo], [], members)
    assert.ok(!noClar.includes('CLARIFY')); ok('no clarify task → contract/snapshot has no CLARIFY (linear unchanged)')

    const clarTask = mk('t1', 'clarify', { title: 'Tarefa A', position: 0 })
    const msgs: MessageRow[] = [
      { id: 'm1', fromMemberId: 'W', toMemberId: 'L', summary: '❓ Qual o produto?', content: 'Qual o produto?', kind: 'message', taskId: 't1' },
    ]
    const snap = buildBoardSnapshot([clarTask], msgs)
    assert.ok(snap.toUpperCase().includes('CLARIFY')); ok('clarify task → [CLARIFY] column in the snapshot')
    assert.ok(snap.includes('Qual o produto?')); ok('snapshot shows the pending question')
    const withClar = buildLeadContext('M', [clarTask], msgs, members)
    assert.ok(withClar.includes('@CLARIFY')); ok('clarify on board → @CLARIFY directive added to the contract')
  }

  // ── 4. E2E: clarify → escalate → answer → re-execute → done ────────
  console.log('coordinator E2E (clarify cycle)')
  {
    // Capture each worker prompt to prove the re-run sees the Lead's answer.
    const workerPrompts: string[] = []
    let reviewerCalls = 0
    const script: Record<string, string[]> = {
      al: ['@TASK [worker:Ana] Landing page', '@CLARIFY [#1] O produto é o Compass, monitor de uso de IA', '@DONE entrega final'],
      aw: ['@CLARIFY Qual é o produto da landing?', 'Landing pronta para o Compass'],
      ar: ['@APPROVE'],
    }
    const base = scriptedChat(script)
    const chat: ChatFn = async (agentId, messages, ctx, opts) => {
      if (agentId === 'aw') workerPrompts.push(messages[0]?.content ?? '')
      if (agentId === 'ar') reviewerCalls++
      return base(agentId, messages, ctx, opts)
    }
    const gra = createMemoryStore({ mission: 'Crie a landing', members })
    await runTeamGraph('run-1', { store: gra.store, chat })

    const task = gra.state.tasks.find(t => t.title === 'Landing page')!
    assert.equal(gra.state.status, 'completed'); ok('run completed after the clarify cycle')
    assert.equal(workerPrompts.length, 2); ok('worker ran twice (clarify turn + re-execute turn)')
    assert.ok(!workerPrompts[0].includes('Compass')); ok('first worker prompt had NO answer (it asked instead)')
    assert.ok(workerPrompts[1].includes('Compass')); ok('re-execute prompt carries the Lead answer as feedback')
    assert.equal(task.status, 'done'); ok('task ends done')
    assert.equal(task.result, 'Landing pronta para o Compass'); ok('result = the re-executed output (not the question)')
    assert.equal(task.retryCount, 0); ok('clarify did NOT increment retryCount (not a rejection)')
    assert.equal(reviewerCalls, 1); ok('reviewer ran ONCE — the clarify never went to review')

    // the worker→lead question was logged as a message under the task
    const qMsg = gra.state.messages.find(m => m.taskId === task.id && m.fromMemberId === 'W' && m.content.includes('produto'))
    assert.ok(qMsg); ok('the clarification question was posted as a worker→lead message')
  }

  // ── 5. Regression: a graph run WITHOUT @CLARIFY behaves like G5 ─────
  console.log('coordinator regression (no @CLARIFY → unchanged)')
  {
    const script: Record<string, string[]> = {
      al: ['@TASK [worker:Ana] X\n  faça', '@DONE concluído'],
      aw: ['resultado da Ana'], ar: ['@APPROVE'],
    }
    const gra = createMemoryStore({ mission: 'Fazer X', members })
    await runTeamGraph('run-1', { store: gra.store, chat: scriptedChat(script) })
    assert.equal(gra.state.status, 'completed'); ok('plain graph run still completes')
    assert.deepEqual(gra.state.tasks.map(t => t.status), ['done']); ok('no clarify status appears (unchanged path)')
    // Consolidation returns the Lead's raw message verbatim (pre-G6 behaviour — the
    // `doneAction.text` shortcut only fires on an EMPTY board, which isn't the case here).
    assert.equal(gra.state.finished?.output, '@DONE concluído'); ok('output identical to the pre-G6 flow')
  }

  console.log(`\n✅ G6 verify: ${passed} assertions passed`)
  console.log('   (regression: run g1 (16) + g2 (22) + g3 (18) + g4 (32) + g4_1 (20) + g5 (18))')
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
