// scripts/g2-verify.ts
// Local verification for the G2 agenda state-machine slice (no DB / no network).
// Jest can't run on this machine (OneDrive errno -4094), so this script asserts
// the same behaviour the jest tests lock in, via tsx. Run: npx tsx scripts/g2-verify.ts
//
// Two halves:
//   1. deriveTaskAction / buildAgenda — the pure state-machine (G2's core).
//   2. Loop regression — runTeamGraph still produces terminal state identical to
//      runTeam (the hard-regression invariant); retry now routes via apply_changes.
import assert from 'node:assert/strict'
import { deriveTaskAction, buildAgenda } from '../src/lib/orchestration/team/team-graph-agenda'
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

// build a TaskRow with overrides (deps/assignee/reviewNote/retry)
function mk(id: string, status: TaskRow['status'], over: Partial<TaskRow> = {}): TaskRow {
  return {
    id, title: id, body: null, status, assigneeId: 'W', result: null,
    reviewNote: null, retryCount: 0, position: 0, dependsOn: [], ...over,
  }
}

async function main() {
  // ── 1. deriveTaskAction — the state machine ────────────────────────
  console.log('deriveTaskAction (state machine)')
  {
    // terminal first: done / rejected → terminal/none (G1 never touches these)
    assert.deepEqual(deriveTaskAction(mk('a', 'done'), []), { nextAction: 'terminal', actionOwner: 'none' })
    ok('done → terminal/none')
    assert.deepEqual(deriveTaskAction(mk('a', 'rejected'), []), { nextAction: 'terminal', actionOwner: 'none' })
    ok('rejected (no retry left) → terminal/none')
    // defensive: a done task that still carries a stale reviewNote+retry is terminal,
    // NOT apply_changes (terminal short-circuits before the retry check).
    assert.equal(deriveTaskAction(mk('a', 'done', { reviewNote: 'x', retryCount: 1 }), []).nextAction, 'terminal')
    ok('done w/ stale reviewNote → still terminal (not apply_changes)')

    // review → reviewer
    assert.deepEqual(deriveTaskAction(mk('a', 'review'), []), { nextAction: 'review', actionOwner: 'reviewer' })
    ok('review → review/reviewer')

    // todo, no deps, has owner → execute/owner
    assert.deepEqual(deriveTaskAction(mk('a', 'todo'), []), { nextAction: 'execute', actionOwner: 'owner' })
    ok('todo + deps ready → execute/owner')

    // deps unmet → wait_dependency/none (parked in blocked)
    const board = [mk('dep', 'doing'), mk('a', 'todo', { dependsOn: ['dep'] })]
    assert.deepEqual(deriveTaskAction(board[1], board), { nextAction: 'wait_dependency', actionOwner: 'none' })
    ok('todo + deps pending → wait_dependency/none')

    // deps met → execute (dep is done)
    const board2 = [mk('dep', 'done'), mk('a', 'todo', { dependsOn: ['dep'] })]
    assert.equal(deriveTaskAction(board2[1], board2).nextAction, 'execute')
    ok('todo + deps done → execute')

    // no owner → assign_owner/lead (deps satisfied first)
    assert.deepEqual(deriveTaskAction(mk('a', 'todo', { assigneeId: null }), []), { nextAction: 'assign_owner', actionOwner: 'lead' })
    ok('no assignee → assign_owner/lead')

    // rejected-but-retry: re-queued as todo with reviewNote + retryCount>0 → apply_changes/owner
    assert.deepEqual(
      deriveTaskAction(mk('a', 'todo', { reviewNote: 'refazer', retryCount: 1 }), []),
      { nextAction: 'apply_changes', actionOwner: 'owner' },
    )
    ok('todo + reviewNote + retry>0 → apply_changes/owner')

    // blocked task whose dep finished → execute (G1 re-runs it); dep still pending → wait
    const bDone = [mk('dep', 'done'), mk('a', 'blocked', { dependsOn: ['dep'] })]
    assert.equal(deriveTaskAction(bDone[1], bDone).nextAction, 'execute')
    ok('blocked + deps now done → execute')
    const bPend = [mk('dep', 'todo'), mk('a', 'blocked', { dependsOn: ['dep'] })]
    assert.equal(deriveTaskAction(bPend[1], bPend).nextAction, 'wait_dependency')
    ok('blocked + deps still pending → wait_dependency')
  }

  // ── 2. buildAgenda — one item per task, classified ─────────────────
  console.log('buildAgenda')
  {
    const board = [mk('done', 'done'), mk('rev', 'review'), mk('run', 'todo')]
    const agenda = buildAgenda(board)
    assert.equal(agenda.length, 3); ok('one item per task')
    assert.deepEqual(agenda.map(i => i.nextAction), ['terminal', 'review', 'execute'])
    ok('actions classified in board order')
    assert.equal(agenda[1].task.id, 'rev'); ok('item carries its task')
  }

  // ── 3. loop regression: graph WITHOUT deps == linear ───────────────
  console.log('loop regression (no deps → linear parity)')
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

  // ── 4. loop regression: dependency gating (A before B; B blocked) ──
  console.log('loop regression (dependency gating)')
  {
    const depScript = {
      al: ['@TASK [worker:Ana] A\n@TASK [worker:Ana] [after:#1] B', '@DONE ok'],
      aw: ['resultado A', 'resultado B'], ar: ['@APPROVE', '@APPROVE'],
    }
    const executed: string[] = []
    const gra = createMemoryStore({ mission: 'M', members })
    await runTeamGraph('run-1', { store: gra.store, chat: recordingChat(depScript, executed) })
    assert.deepEqual(executed, ['A', 'B']); ok('A executes before B')
    assert.equal(gra.state.tasks.find(t => t.title === 'B')!.status, 'done'); ok('B done after A completes')

    const ex1: string[] = []
    const gra1 = createMemoryStore({ mission: 'M', members, config: { maxTurns: 1, retryCap: 2 } })
    await runTeamGraph('run-1', { store: gra1.store, chat: recordingChat(depScript, ex1) })
    assert.deepEqual(ex1, ['A']); ok('B never runs while A not done (1 turn)')
    assert.equal(gra1.state.tasks.find(t => t.title === 'B')!.status, 'blocked'); ok('B parked in blocked')
  }

  // ── 5. apply_changes end-to-end: reject once → owner re-runs → done ─
  console.log('apply_changes (retry routes to owner)')
  {
    const script = {
      al: ['@TASK [worker:Ana] X', '@DONE ok'],
      aw: ['v1', 'v2'], ar: ['@REJECT precisa melhorar', '@APPROVE'],
    }
    const executed: string[] = []
    const gra = createMemoryStore({ mission: 'M', members })
    await runTeamGraph('run-1', { store: gra.store, chat: recordingChat(script, executed) })
    assert.deepEqual(executed, ['X', 'X']); ok('worker runs X twice (initial + apply_changes)')
    assert.equal(gra.state.status, 'completed'); ok('run completes after retry')
    const x = gra.state.tasks.find(t => t.title === 'X')!
    assert.equal(x.status, 'done'); assert.equal(x.retryCount, 1); ok('X done with retryCount 1')
  }

  console.log(`\n✅ G2 verify: ${passed} assertions passed`)
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
