// scripts/g3-verify.ts
// Local verification for the G3 parallel-agendas slice (no DB / no network).
// Jest can't run on this machine (OneDrive errno -4094), so this script asserts
// the same behaviour the jest tests lock in, via tsx. Run: npx tsx scripts/g3-verify.ts
//
// Three halves:
//   1. runWithConcurrency — the pure bounded-concurrency helper (cap, order, clamp).
//   2. Coordinator fan-out — two INDEPENDENT tasks run concurrently (barrier proof);
//      maxParallel=1 serializes (≤1 in flight); DEPENDENT tasks serialize (turns).
//   3. Regression note — g1-verify (16) + g2-verify (22) must still pass (run them
//      separately: `npx tsx scripts/g1-verify.ts && npx tsx scripts/g2-verify.ts`).
import assert from 'node:assert/strict'
import { runWithConcurrency } from '../src/lib/orchestration/team/team-concurrency'
import { runTeamGraph } from '../src/lib/orchestration/team/team-graph-coordinator'
import type { ChatFn, ChatResult, MemberCtx, TaskRow, MessageRow, RunStatus } from '../src/lib/orchestration/team/team-types'
import type {
  TeamStore, LoadedRun, CreateTaskInput, UpdateTaskInput, AddMessageInput, FinishRunInput,
} from '../src/lib/orchestration/team/team-store'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }
const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// ── in-memory store — mirrors g2-verify, but config is WIDENED with the optional
// `maxParallel` (G3) so a test can throttle the fan-out. The shared test stores
// (helpers/memory-store.ts, g1/g2-verify) stay UNTOUCHED. ──
interface MemState { status: RunStatus; finished?: FinishRunInput; tasks: TaskRow[]; messages: MessageRow[] }
function createMemoryStore(opts: {
  mission: string; members: MemberCtx[]; config?: { maxTurns: number; retryCap: number; maxParallel?: number }
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

// Lead + TWO workers (Ana, Bob) + reviewer — so two tasks can be assigned to
// different owners and become runnable in the SAME turn (the G3 fan-out case).
const members: MemberCtx[] = [
  { id: 'L', agentId: 'al', agentName: 'Lia', role: 'lead', model: null, effort: null },
  { id: 'WA', agentId: 'aw', agentName: 'Ana', role: 'worker', model: null, effort: null },
  { id: 'WB', agentId: 'ab', agentName: 'Bob', role: 'worker', model: null, effort: null },
  { id: 'R', agentId: 'ar', agentName: 'Rex', role: 'reviewer', model: null, effort: null },
]
const WORKERS = new Set(['aw', 'ab'])
const reply = (message: string): ChatResult => ({ message, model: 'mock', usage: { total_tokens: 10 } })
function scriptedChat(script: Record<string, string[]>): ChatFn {
  const idx: Record<string, number> = {}
  return async (agentId) => {
    const queue = script[agentId] ?? []
    const i = idx[agentId] ?? 0; idx[agentId] = i + 1
    return reply(queue[Math.min(i, queue.length - 1)] ?? '@DONE vazio')
  }
}
const taskTitle = (messages: { content: string }[]) => (messages[0]?.content ?? '').match(/## Tarefa\n(\S+)/)?.[1]

/** Worker chat that gates on a barrier: a worker call only proceeds once `n`
 *  worker calls have arrived. With n=2 this PROVES two tasks were in flight at
 *  once; if the loop serialized, only 1 ever arrives → the race times out and
 *  throws (a loud regression). */
function barrierWorkerChat(script: Record<string, string[]>, n: number, starts: string[], timeoutMs = 2000): ChatFn {
  const base = scriptedChat(script)
  let count = 0
  let release!: () => void
  const gate = new Promise<void>(r => { release = r })
  return async (agentId, messages, ctx, opts) => {
    if (WORKERS.has(agentId)) {
      const t = taskTitle(messages); if (t) starts.push(t)
      if (++count >= n) release()
      await Promise.race([
        gate,
        delay(timeoutMs).then(() => { throw new Error(`barrier(${n}) timeout — only ${count} worker task(s) ran concurrently`) }),
      ])
    }
    return base(agentId, messages, ctx, opts)
  }
}

/** Worker chat that tracks max concurrency: each worker call holds for `delayMs`
 *  so overlapping calls are observable. `probe.max` = peak simultaneous workers. */
function trackingWorkerChat(script: Record<string, string[]>, probe: { inFlight: number; max: number; starts: string[] }, delayMs = 15): ChatFn {
  const base = scriptedChat(script)
  return async (agentId, messages, ctx, opts) => {
    if (WORKERS.has(agentId)) {
      const t = taskTitle(messages); if (t) probe.starts.push(t)
      probe.inFlight++; probe.max = Math.max(probe.max, probe.inFlight)
      try { await delay(delayMs); return await base(agentId, messages, ctx, opts) }
      finally { probe.inFlight-- }
    }
    return base(agentId, messages, ctx, opts)
  }
}

async function main() {
  // ── 1. runWithConcurrency — pure helper ────────────────────────────
  console.log('runWithConcurrency (bounded concurrency)')
  {
    assert.deepEqual(await runWithConcurrency([], 3, async x => x), []); ok('empty input → []')

    // Results are collected by INPUT INDEX, not completion order: item 0 finishes
    // LAST (longest delay) yet results stay [0,10,20,...].
    const n = 6
    const items = Array.from({ length: n }, (_, i) => i)
    const ordered = await runWithConcurrency(items, 3, async (i) => { await delay((n - i) * 4); return i * 10 })
    assert.deepEqual(ordered, items.map(i => i * 10)); ok('results preserved by index (not by completion order)')

    // cap respected: peak in-flight reaches the cap but never exceeds it.
    async function withCap(total: number, cap: number) {
      let inFlight = 0, max = 0
      const res = await runWithConcurrency(Array.from({ length: total }, (_, i) => i), cap, async (i) => {
        inFlight++; max = Math.max(max, inFlight); await delay(15); inFlight--; return i
      })
      return { max, len: res.length }
    }
    const c3 = await withCap(10, 3)
    assert.equal(c3.max, 3); assert.equal(c3.len, 10); ok('cap=3 over 10 items → peak exactly 3, all run')
    const c1 = await withCap(5, 1)
    assert.equal(c1.max, 1); ok('cap=1 → fully sequential (peak 1)')
    const c0 = await withCap(4, 0)
    assert.equal(c0.max, 1); ok('cap=0 clamped to 1')
    const cBig = await withCap(2, 9)
    assert.equal(cBig.max, 2); ok('cap > items → capped to item count')
  }

  // ── 2a. two INDEPENDENT tasks run concurrently (barrier proof) ─────
  console.log('coordinator fan-out (independent tasks concurrent)')
  {
    const script = {
      al: ['@TASK [worker:Ana] A\n@TASK [worker:Bob] B', '@DONE ok'],
      aw: ['resultado A'], ab: ['resultado B'], ar: ['@APPROVE', '@APPROVE'],
    }
    const starts: string[] = []
    const gra = createMemoryStore({ mission: 'M', members }) // default maxParallel = workers.length = 2
    await runTeamGraph('run-1', { store: gra.store, chat: barrierWorkerChat(script, 2, starts) })
    assert.equal(starts.length, 2); ok('both A and B entered the worker (barrier released → concurrent)')
    assert.deepEqual([...starts].sort(), ['A', 'B']); ok('A and B both executed')
    assert.equal(gra.state.status, 'completed'); ok('run completed')
    assert.deepEqual(gra.state.tasks.map(t => t.status).sort(), ['done', 'done']); ok('both tasks done')
  }

  // ── 2b. maxParallel=1 serializes the SAME independent tasks ────────
  console.log('coordinator fan-out (maxParallel=1 serializes)')
  {
    const script = {
      al: ['@TASK [worker:Ana] A\n@TASK [worker:Bob] B', '@DONE ok'],
      aw: ['resultado A'], ab: ['resultado B'], ar: ['@APPROVE', '@APPROVE'],
    }
    const probe = { inFlight: 0, max: 0, starts: [] as string[] }
    const gra = createMemoryStore({ mission: 'M', members, config: { maxTurns: 6, retryCap: 2, maxParallel: 1 } })
    await runTeamGraph('run-1', { store: gra.store, chat: trackingWorkerChat(script, probe) })
    assert.equal(probe.max, 1); ok('peak in-flight workers = 1 (serialized)')
    assert.deepEqual([...probe.starts].sort(), ['A', 'B']); ok('both tasks still executed')
    assert.equal(gra.state.status, 'completed'); ok('run completed under maxParallel=1')
  }

  // ── 2c. DEPENDENT tasks serialize across turns (fan-in) ────────────
  console.log('coordinator fan-out (dependents serialize across turns)')
  {
    const depScript = {
      al: ['@TASK [worker:Ana] A\n@TASK [worker:Ana] [after:#1] B', '@DONE ok'],
      aw: ['resultado A', 'resultado B'], ar: ['@APPROVE', '@APPROVE'],
    }
    const probe = { inFlight: 0, max: 0, starts: [] as string[] }
    const gra = createMemoryStore({ mission: 'M', members }) // default cap, but each turn has ≤1 runnable
    await runTeamGraph('run-1', { store: gra.store, chat: trackingWorkerChat(depScript, probe) })
    assert.equal(probe.max, 1); ok('B never overlaps A (dependency fan-in → peak 1)')
    assert.deepEqual(probe.starts, ['A', 'B']); ok('A executes before B')
    assert.equal(gra.state.tasks.find(t => t.title === 'B')!.status, 'done'); ok('B done after A completes')

    // 1-turn cap: B parked in `blocked` while A not yet done (regression: G1/G2 gating intact).
    const ex: string[] = []
    const gra1 = createMemoryStore({ mission: 'M', members, config: { maxTurns: 1, retryCap: 2 } })
    await runTeamGraph('run-1', { store: gra1.store, chat: trackingWorkerChat(depScript, { inFlight: 0, max: 0, starts: ex }) })
    assert.deepEqual(ex, ['A']); ok('B never runs while A not done (1 turn)')
    assert.equal(gra1.state.tasks.find(t => t.title === 'B')!.status, 'blocked'); ok('B parked in blocked')
  }

  console.log(`\n✅ G3 verify: ${passed} assertions passed`)
  console.log('   (regression: run `npx tsx scripts/g1-verify.ts` (16) + `npx tsx scripts/g2-verify.ts` (22))')
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
