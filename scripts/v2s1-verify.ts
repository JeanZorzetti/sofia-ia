// scripts/v2s1-verify.ts
// Local verification for Teams V2 — fatia S1.1 (per-member capability policy: data +
// plumbing, NO behavior change). Jest can't run on this machine (OneDrive errno -4094),
// so this script asserts the S1.1 contract via tsx. Run: npx tsx scripts/v2s1-verify.ts
//
// What S1.1 promises:
//   1. `CapabilityPolicy` flows member → ChatOptions → chat() for EVERY role
//      (lead planning + consolidation, worker, reviewer) in BOTH coordinators
//      (runTeam linear + runTeamGraph).
//   2. A member WITHOUT a policy yields `options.capabilities === undefined`
//      (legacy path untouched) — the pre-existing model/effort/taskId/runId opts
//      are still carried verbatim.
//   3. The plumbing is inert: a run with policies settles to the SAME terminal
//      state as one without (chatWithAgent only reads/logs the policy in S1.1).
import assert from 'node:assert/strict'
import { runTeam } from '../src/lib/orchestration/team/team-coordinator'
import { runTeamGraph } from '../src/lib/orchestration/team/team-graph-coordinator'
import type {
  ChatFn, ChatResult, ChatOptions, MemberCtx, TaskRow, MessageRow, RunStatus, CapabilityPolicy,
} from '../src/lib/orchestration/team/team-types'
import type {
  TeamStore, LoadedRun, CreateTaskInput, UpdateTaskInput, AddMessageInput, FinishRunInput,
} from '../src/lib/orchestration/team/team-store'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

// ── in-memory store (mirrors g6-verify) ──
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

// per-call options capture, keyed by agentId (the lead is called >1x per run).
type Capture = { agentId: string; options?: ChatOptions }
function capturingChat(script: Record<string, string[]>): { chat: ChatFn; calls: Capture[] } {
  const idx: Record<string, number> = {}
  const calls: Capture[] = []
  const chat: ChatFn = async (agentId, _messages, _ctx, options) => {
    calls.push({ agentId, options })
    const queue = script[agentId] ?? []
    const i = idx[agentId] ?? 0; idx[agentId] = i + 1
    const message = queue[Math.min(i, queue.length - 1)] ?? '@DONE vazio'
    const r: ChatResult = { message, model: 'mock', usage: { total_tokens: 10 } }
    return r
  }
  return { chat, calls }
}

// distinct policies per role so we can prove each member's OWN policy is forwarded.
const capsLead: CapabilityPolicy = { tools: true, toolSkills: true }
const capsWorker: CapabilityPolicy = { tools: true, mcpAllowlist: ['srv-db-1', 'srv-http-2'], filesystem: true }
const capsReviewer: CapabilityPolicy = { tools: false }

function roster(withCaps: boolean): MemberCtx[] {
  return [
    { id: 'L', agentId: 'al', agentName: 'Lia', role: 'lead', model: null, effort: null, ...(withCaps ? { capabilities: capsLead } : {}) },
    { id: 'W', agentId: 'aw', agentName: 'Ana', role: 'worker', model: null, effort: null, ...(withCaps ? { capabilities: capsWorker } : {}) },
    { id: 'R', agentId: 'ar', agentName: 'Rex', role: 'reviewer', model: null, effort: null, ...(withCaps ? { capabilities: capsReviewer } : {}) },
  ]
}

// a one-task run that drives all four call sites: lead plans → worker executes →
// reviewer approves → board settles → lead consolidates.
const script: Record<string, string[]> = {
  al: ['@TASK [worker:Ana] Fazer X', 'consolidado final'],
  aw: ['resultado da Ana'],
  ar: ['@APPROVE'],
}

function optsFor(calls: Capture[], agentId: string): (ChatOptions | undefined)[] {
  return calls.filter(c => c.agentId === agentId).map(c => c.options)
}

async function main() {
  // ── 1. linear coordinator (runTeam): every role forwards its OWN policy ──
  console.log('runTeam (linear) — capability policy plumbing')
  {
    const { store, state } = createMemoryStore({ mission: 'M', members: roster(true) })
    const { chat, calls } = capturingChat(script)
    await runTeam('run-1', { store, chat })

    assert.equal(state.status, 'completed'); ok('run completed (plumbing is inert)')

    const leadOpts = optsFor(calls, 'al')
    assert.ok(leadOpts.length >= 2); ok('lead was called ≥2x (planning + consolidation)')
    for (const o of leadOpts) assert.deepEqual(o?.capabilities, capsLead)
    ok('every lead call carries the LEAD policy')

    const workerOpts = optsFor(calls, 'aw')
    assert.equal(workerOpts.length, 1); ok('worker called once')
    assert.deepEqual(workerOpts[0]?.capabilities, capsWorker); ok('worker call carries the WORKER policy')
    // regression: pre-existing per-call opts are still present alongside capabilities.
    assert.equal(workerOpts[0]?.taskId, state.tasks[0].id); ok('worker still carries taskId (C2.1 intact)')
    assert.equal(workerOpts[0]?.runId, 'run-1'); ok('worker still carries runId (C2.1 intact)')

    const reviewerOpts = optsFor(calls, 'ar')
    assert.equal(reviewerOpts.length, 1); ok('reviewer called once')
    assert.deepEqual(reviewerOpts[0]?.capabilities, capsReviewer); ok('reviewer call carries the REVIEWER policy')
  }

  // ── 2. graph coordinator (runTeamGraph): same contract ──
  console.log('runTeamGraph (graph) — capability policy plumbing')
  {
    const { store, state } = createMemoryStore({ mission: 'M', members: roster(true) })
    const { chat, calls } = capturingChat(script)
    await runTeamGraph('run-1', { store, chat })

    assert.equal(state.status, 'completed'); ok('graph run completed (plumbing is inert)')
    for (const o of optsFor(calls, 'al')) assert.deepEqual(o?.capabilities, capsLead)
    ok('lead policy forwarded in graph mode')
    assert.deepEqual(optsFor(calls, 'aw')[0]?.capabilities, capsWorker); ok('worker policy forwarded in graph mode')
    assert.deepEqual(optsFor(calls, 'ar')[0]?.capabilities, capsReviewer); ok('reviewer policy forwarded in graph mode')
  }

  // ── 3. legacy roster (no policy): capabilities is undefined everywhere ──
  console.log('legacy roster (no capabilities) — undefined, model/effort untouched')
  {
    const { store, state } = createMemoryStore({ mission: 'M', members: roster(false) })
    const { chat, calls } = capturingChat(script)
    await runTeam('run-1', { store, chat })

    assert.equal(state.status, 'completed'); ok('legacy run completed')
    for (const c of calls) {
      assert.equal(c.options?.capabilities, undefined)
    }
    ok('NO call carries a capabilities key (legacy path untouched)')
    // model/effort still flow as before (null here, but present as keys).
    const w = optsFor(calls, 'aw')[0]
    assert.ok(w && 'model' in w && 'effort' in w); ok('worker opts still carry model/effort keys')
    assert.equal(w?.taskId, state.tasks[0].id); ok('worker opts still carry taskId (no regression)')
  }

  // ── 4. type-level: CapabilityPolicy shape + ChatOptions field are wired ──
  console.log('type-level: CapabilityPolicy shape + ChatOptions.capabilities')
  {
    const full: CapabilityPolicy = { tools: true, mcpAllowlist: ['a'], toolSkills: false, filesystem: true }
    const empty: CapabilityPolicy = {}
    const opt: ChatOptions = { model: 'x', effort: 'low', capabilities: full }
    assert.equal(opt.capabilities, full); ok('ChatOptions accepts a capabilities policy')
    assert.deepEqual(Object.keys(empty), []); ok('all CapabilityPolicy fields are optional (empty is valid)')
    const m: MemberCtx = { id: 'x', agentId: 'a', agentName: 'n', role: 'worker', model: null, effort: null, capabilities: full }
    assert.deepEqual(m.capabilities, full); ok('MemberCtx accepts a capabilities policy')
  }

  console.log(`\n✅ v2s1 verify: ${passed} assertions passed`)
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
