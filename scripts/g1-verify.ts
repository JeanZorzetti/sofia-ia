// scripts/g1-verify.ts
// Local verification for the G1 dependency-DAG slice (no DB / no network).
// Jest can't run on this machine (OneDrive errno -4094), so this script asserts
// the same behaviour the jest tests lock in, via tsx. Run: npx tsx scripts/g1-verify.ts
import assert from 'node:assert/strict'
import { parseLeadActions } from '../src/lib/orchestration/team/team-protocol'
import { depsSatisfied } from '../src/lib/orchestration/team/team-board'
import { runTeam } from '../src/lib/orchestration/team/team-coordinator'
import { runTeamGraph } from '../src/lib/orchestration/team/team-graph-coordinator'
import type { ChatFn, ChatResult, MemberCtx, TaskRow, MessageRow, RunStatus } from '../src/lib/orchestration/team/team-types'
import type {
  TeamStore, LoadedRun, CreateTaskInput, UpdateTaskInput, AddMessageInput, FinishRunInput,
} from '../src/lib/orchestration/team/team-store'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

// ── in-memory store (mirrors src/__tests__/.../helpers/memory-store.ts) ──
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
function recordingChat(script: Record<string, string[]>, executed: string[]): ChatFn {
  const base = scriptedChat(script)
  return async (agentId, messages2, ctx, opts) => {
    if (agentId === 'aw') {
      const m = (messages2[0]?.content ?? '').match(/## Tarefa\n(\S+)/)
      if (m) executed.push(m[1])
    }
    return base(agentId, messages2, ctx, opts)
  }
}

async function main() {
  // ── 1. parseLeadActions [after:#n] ─────────────────────────────────
  console.log('parseLeadActions [after:#n]')
  {
    const a = parseLeadActions('@TASK [worker:Ana] [after:#2] Depende da 2')[0]
    assert.equal(a.title, 'Depende da 2')
    assert.deepEqual(a.assignTo, { kind: 'name', value: 'Ana' })
    assert.deepEqual(a.dependsOn, [2]); ok('single dep #2, assignTo preserved')

    const b = parseLeadActions('@TASK [worker:Ana] [after:#1,#3] T')[0]
    assert.deepEqual(b.dependsOn, [1, 3]); assert.equal(b.title, 'T'); ok('multi dep #1,#3')

    const c = parseLeadActions('@TASK [after:#1] [worker:Bob] T')[0]
    assert.deepEqual(c.assignTo, { kind: 'name', value: 'Bob' })
    assert.deepEqual(c.dependsOn, [1]); assert.equal(c.title, 'T'); ok('order-independent (after before worker)')

    const d = parseLeadActions('@TASK [worker:Ana] Sem dep')[0]
    assert.equal(d.dependsOn, undefined); assert.equal(d.title, 'Sem dep'); ok('no [after:] → dependsOn undefined')

    // regression: @MESSAGE still parses byte-identically
    assert.deepEqual(parseLeadActions('@MESSAGE [para:Ana] oi'), [{ type: 'message', to: 'Ana', summary: 'oi' }])
    ok('@MESSAGE unchanged')
  }

  // ── 2. depsSatisfied ───────────────────────────────────────────────
  console.log('depsSatisfied')
  {
    const mk = (id: string, status: TaskRow['status'], dependsOn: string[] = []): TaskRow =>
      ({ id, title: id, body: null, status, assigneeId: null, result: null, reviewNote: null, retryCount: 0, position: 0, dependsOn })
    const A = mk('a', 'done'); const Adoing = mk('a', 'doing')
    assert.equal(depsSatisfied(mk('b', 'todo'), [A]), true); ok('no deps → satisfied')
    assert.equal(depsSatisfied(mk('b', 'todo', ['a']), [A]), true); ok('dep done → satisfied')
    assert.equal(depsSatisfied(mk('b', 'todo', ['a']), [Adoing]), false); ok('dep not done → unsatisfied')
    assert.equal(depsSatisfied(mk('b', 'todo', ['ghost']), [A]), false); ok('unknown dep id → unsatisfied (conservative)')
  }

  // ── 3. runTeamGraph runs A before B (B depends on A) ───────────────
  console.log('runTeamGraph dependency gating')
  const depScript = {
    al: ['@TASK [worker:Ana] A\n@TASK [worker:Ana] [after:#1] B', '@DONE ok'],
    aw: ['resultado A', 'resultado B'],
    ar: ['@APPROVE', '@APPROVE'],
  }
  {
    const executed: string[] = []
    const gra = createMemoryStore({ mission: 'M', members })
    await runTeamGraph('run-1', { store: gra.store, chat: recordingChat(depScript, executed) })
    assert.deepEqual(executed, ['A', 'B']); ok('A executes before B')
    const a = gra.state.tasks.find(t => t.title === 'A')!
    const b = gra.state.tasks.find(t => t.title === 'B')!
    assert.equal(a.status, 'done'); assert.equal(b.status, 'done'); ok('both done')
    assert.deepEqual(b.dependsOn, [a.id]); ok('display #1 resolved to A real id')
  }

  // ── 4. dependent task held in `blocked` while dep not done ─────────
  {
    const executed: string[] = []
    const gra = createMemoryStore({ mission: 'M', members, config: { maxTurns: 1, retryCap: 2 } })
    await runTeamGraph('run-1', { store: gra.store, chat: recordingChat(depScript, executed) })
    assert.deepEqual(executed, ['A']); ok('B never runs while A not done (1 turn)')
    assert.equal(gra.state.tasks.find(t => t.title === 'A')!.status, 'done'); ok('A done after its turn')
    assert.equal(gra.state.tasks.find(t => t.title === 'B')!.status, 'blocked'); ok('B parked in blocked')
  }

  // ── 5. regression: graph WITHOUT deps == linear ────────────────────
  console.log('regression (no deps → linear parity)')
  {
    const script = {
      al: ['@TASK [worker:Ana] X\n  faça', '@DONE concluído'],
      aw: ['resultado da Ana'], ar: ['@APPROVE'],
    }
    const lin = createMemoryStore({ mission: 'Fazer X', members })
    await runTeam('run-1', { store: lin.store, chat: scriptedChat(script) })
    const gra = createMemoryStore({ mission: 'Fazer X', members })
    await runTeamGraph('run-1', { store: gra.store, chat: scriptedChat(script) })
    assert.equal(gra.state.status, 'completed')
    assert.deepEqual(gra.state.tasks.map(t => t.status), lin.state.tasks.map(t => t.status))
    assert.equal(gra.state.finished?.output, lin.state.finished?.output)
    ok('graph parity with linear on a dependency-free board')
  }

  console.log(`\n✅ G1 verify: ${passed} assertions passed`)
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
