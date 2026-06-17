// src/__tests__/lib/team/helpers/memory-store.ts
// In-memory TeamStore for deterministic coordinator tests.
import type {
  TeamStore, LoadedRun, CreateTaskInput, UpdateTaskInput, AddMessageInput, FinishRunInput,
} from '@/lib/orchestration/team/team-store'
import type { MemberCtx, TaskRow, MessageRow, RunStatus } from '@/lib/orchestration/team/team-types'

export interface MemoryState {
  status: RunStatus
  finished?: FinishRunInput
  tasks: TaskRow[]
  messages: MessageRow[]
}

export function createMemoryStore(opts: {
  mission: string
  members: MemberCtx[]
  config?: { maxTurns: number; retryCap: number }
}): { store: TeamStore; state: MemoryState; cancel: () => void } {
  const state: MemoryState = { status: 'pending', tasks: [], messages: [] }
  let taskSeq = 0
  let msgSeq = 0
  const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))

  const store: TeamStore = {
    async loadRun(): Promise<LoadedRun> {
      return {
        runId: 'run-1', teamId: 'team-1', mission: opts.mission,
        config: opts.config ?? { maxTurns: 6, retryCap: 2 },
        members: opts.members,
      }
    },
    async getRunStatus() { return state.status },
    async setRunRunning() { state.status = 'running' },
    async finishRun(_runId, data: FinishRunInput) { state.status = data.status; state.finished = data },
    async listTasks() { return clone(state.tasks) },
    async createTask(_runId, data: CreateTaskInput) {
      const row: TaskRow = {
        id: `t${++taskSeq}`, title: data.title, body: data.body ?? null,
        status: data.status ?? 'todo', assigneeId: data.assigneeId ?? null,
        result: null, reviewNote: null, retryCount: 0, position: state.tasks.length,
        dependsOn: data.dependsOn ?? [],
      }
      state.tasks.push(row)
      return clone(row)
    },
    async updateTask(taskId, data: UpdateTaskInput) {
      const t = state.tasks.find(x => x.id === taskId)
      if (t) Object.assign(t, data)
    },
    async listMessages() { return clone(state.messages) },
    async addMessage(_runId, data: AddMessageInput) {
      state.messages.push({
        id: `m${++msgSeq}`, fromMemberId: data.fromMemberId ?? null,
        toMemberId: data.toMemberId ?? null, summary: data.summary ?? null,
        content: data.content, kind: data.kind, taskId: data.taskId ?? null,
      })
    },
  }
  return { store, state, cancel: () => { state.status = 'cancelled' } }
}
