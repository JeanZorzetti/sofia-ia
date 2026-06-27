// src/__tests__/lib/team/serialize-store.test.ts
// T006 — withReviewerSerialization: forces maxParallel=1 only when roster has reviewer
import { withReviewerSerialization } from '@/lib/orchestration/team/serialize-store'
import type { TeamStore } from '@/lib/orchestration/team/team-store'

function makeStore(members: { role: string }[]): TeamStore {
  const run = {
    runId: 'r1', teamId: 't1', mission: 'x',
    config: { maxTurns: 10, retryCap: 3, maxParallel: 4 },
    members: members.map((m, i) => ({
      id: `m${i}`, agentId: `a${i}`, agentName: `Agent${i}`, role: m.role as never,
      model: null, effort: null,
    })),
  }
  return {
    loadRun: async () => run,
    // ponytail: minimal passthrough stubs — only loadRun matters for this test
    createTask: async () => ({ id: 'task1', title: '', body: null, status: 'todo', assigneeId: null, result: null, reviewNote: null, retryCount: 0, position: 0, dependsOn: [], related: [] }),
    updateTask: async () => {},
    listTasks: async () => [],
    addMessage: async () => ({ id: 'm1', fromMemberId: null, toMemberId: null, summary: null, content: '', kind: 'message', taskId: null }),
    listMessages: async () => [],
    finishRun: async () => {},
  } as unknown as TeamStore
}

describe('withReviewerSerialization', () => {
  it('forces maxParallel=1 when roster has a reviewer', async () => {
    const store = makeStore([{ role: 'worker' }, { role: 'reviewer' }])
    const decorated = withReviewerSerialization(store)
    const run = await decorated.loadRun('r1')
    expect(run!.config.maxParallel).toBe(1)
  })

  it('leaves maxParallel untouched when no reviewer', async () => {
    const store = makeStore([{ role: 'lead' }, { role: 'worker' }])
    const decorated = withReviewerSerialization(store)
    const run = await decorated.loadRun('r1')
    expect(run!.config.maxParallel).toBe(4)
  })

  it('passes through all other methods unchanged', async () => {
    const store = makeStore([{ role: 'worker' }])
    const decorated = withReviewerSerialization(store)
    // other methods must exist and be callable
    expect(typeof decorated.listTasks).toBe('function')
    expect(typeof decorated.updateTask).toBe('function')
    expect(typeof decorated.finishRun).toBe('function')
  })
})
