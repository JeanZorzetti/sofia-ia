// src/__tests__/lib/team/team-graph-coordinator-parallel.test.ts
// G3 (parallel agendas): the graph coordinator fans out the EXECUTE/REVIEW
// buckets. These tests lock the three guarantees:
//   1. two INDEPENDENT tasks run concurrently (barrier proof);
//   2. `config.maxParallel = 1` serializes them (≤1 worker in flight);
//   3. DEPENDENT tasks never overlap (fan-in: B waits for A across turns).
//
// A LOCAL in-memory store is used here (not the shared helpers/memory-store)
// because this slice needs `config.maxParallel` — kept out of the shared helper
// so the regression tests stay untouched.
import { runTeamGraph } from '@/lib/orchestration/team/team-graph-coordinator'
import type {
  TeamStore, LoadedRun, CreateTaskInput, UpdateTaskInput, AddMessageInput, FinishRunInput,
} from '@/lib/orchestration/team/team-store'
import type { ChatFn, ChatResult, MemberCtx, TaskRow, MessageRow, RunStatus } from '@/lib/orchestration/team/team-types'

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

interface MemState { status: RunStatus; finished?: FinishRunInput; tasks: TaskRow[]; messages: MessageRow[] }
function createStore(opts: {
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

// Two-independent-task script: A→Ana, B→Bob, no deps → both runnable in turn 0.
const indepScript = {
  al: ['@TASK [worker:Ana] A\n@TASK [worker:Bob] B', '@DONE ok'],
  aw: ['resultado A'], ab: ['resultado B'], ar: ['@APPROVE', '@APPROVE'],
}

describe('runTeamGraph — G3 parallel execution', () => {
  it('runs two independent tasks concurrently (barrier releases only when both are in flight)', async () => {
    const starts: string[] = []
    let count = 0
    let release!: () => void
    const gate = new Promise<void>(r => { release = r })
    const chat: ChatFn = async (agentId, messages, ctx, opts) => {
      if (WORKERS.has(agentId)) {
        const t = taskTitle(messages); if (t) starts.push(t)
        if (++count >= 2) release()
        // If the loop serialized, only 1 call ever arrives → this races a timeout.
        await Promise.race([
          gate,
          delay(2000).then(() => { throw new Error(`barrier timeout — only ${count} task(s) concurrent`) }),
        ])
      }
      return scriptedChat(indepScript)(agentId, messages, ctx, opts)
    }
    const gra = createStore({ mission: 'M', members }) // default maxParallel = 2 (roster width)
    await runTeamGraph('run-1', { store: gra.store, chat })

    expect(starts.sort()).toEqual(['A', 'B'])
    expect(gra.state.status).toBe('completed')
    expect(gra.state.tasks.map(t => t.status).sort()).toEqual(['done', 'done'])
  })

  it('serializes the same independent tasks when maxParallel = 1', async () => {
    let inFlight = 0
    let max = 0
    const starts: string[] = []
    const chat: ChatFn = async (agentId, messages, ctx, opts) => {
      if (WORKERS.has(agentId)) {
        const t = taskTitle(messages); if (t) starts.push(t)
        inFlight++; max = Math.max(max, inFlight)
        try { await delay(15) } finally { inFlight-- }
      }
      return scriptedChat(indepScript)(agentId, messages, ctx, opts)
    }
    const gra = createStore({ mission: 'M', members, config: { maxTurns: 6, retryCap: 2, maxParallel: 1 } })
    await runTeamGraph('run-1', { store: gra.store, chat })

    expect(max).toBe(1)
    expect(starts.sort()).toEqual(['A', 'B'])
    expect(gra.state.status).toBe('completed')
  })

  it('never overlaps dependent tasks — B waits for A across turns (fan-in)', async () => {
    const depScript = {
      al: ['@TASK [worker:Ana] A\n@TASK [worker:Ana] [after:#1] B', '@DONE ok'],
      aw: ['resultado A', 'resultado B'], ar: ['@APPROVE', '@APPROVE'],
    }
    let inFlight = 0
    let max = 0
    const starts: string[] = []
    const chat: ChatFn = async (agentId, messages, ctx, opts) => {
      if (WORKERS.has(agentId)) {
        const t = taskTitle(messages); if (t) starts.push(t)
        inFlight++; max = Math.max(max, inFlight)
        try { await delay(15) } finally { inFlight-- }
      }
      return scriptedChat(depScript)(agentId, messages, ctx, opts)
    }
    const gra = createStore({ mission: 'M', members }) // default cap, but ≤1 runnable per turn
    await runTeamGraph('run-1', { store: gra.store, chat })

    expect(max).toBe(1) // B never in flight while A runs
    expect(starts).toEqual(['A', 'B'])
    expect(gra.state.tasks.find(t => t.title === 'B')!.status).toBe('done')
  })
})
