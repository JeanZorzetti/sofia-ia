// src/__tests__/lib/team/team-graph-agenda.test.ts
// G2 — the agenda state-machine (deriveTaskAction / buildAgenda). Pure functions,
// no I/O. These lock in the per-task routing the graph loop relies on; the loop
// regression itself is covered by team-graph-coordinator.test.ts.
import { deriveTaskAction, buildAgenda } from '@/lib/orchestration/team/team-graph-agenda'
import type { TaskRow } from '@/lib/orchestration/team/team-types'

function mk(id: string, status: TaskRow['status'], over: Partial<TaskRow> = {}): TaskRow {
  return {
    id, title: id, body: null, status, assigneeId: 'W', result: null,
    reviewNote: null, retryCount: 0, position: 0, dependsOn: [], ...over,
  }
}

describe('deriveTaskAction — per-task routing', () => {
  it('routes done / rejected tasks to terminal (G1 never touches them)', () => {
    expect(deriveTaskAction(mk('a', 'done'), [])).toEqual({ nextAction: 'terminal', actionOwner: 'none' })
    expect(deriveTaskAction(mk('a', 'rejected'), [])).toEqual({ nextAction: 'terminal', actionOwner: 'none' })
  })

  it('keeps a done task terminal even with a stale reviewNote (terminal short-circuits)', () => {
    expect(deriveTaskAction(mk('a', 'done', { reviewNote: 'x', retryCount: 1 }), []).nextAction).toBe('terminal')
  })

  it('routes a task in review to the reviewer', () => {
    expect(deriveTaskAction(mk('a', 'review'), [])).toEqual({ nextAction: 'review', actionOwner: 'reviewer' })
  })

  it('routes a ready owned task to execute', () => {
    expect(deriveTaskAction(mk('a', 'todo'), [])).toEqual({ nextAction: 'execute', actionOwner: 'owner' })
  })

  it('parks a task with pending dependencies in wait_dependency', () => {
    const board = [mk('dep', 'doing'), mk('a', 'todo', { dependsOn: ['dep'] })]
    expect(deriveTaskAction(board[1], board)).toEqual({ nextAction: 'wait_dependency', actionOwner: 'none' })
  })

  it('releases a task once all its dependencies are done', () => {
    const board = [mk('dep', 'done'), mk('a', 'todo', { dependsOn: ['dep'] })]
    expect(deriveTaskAction(board[1], board).nextAction).toBe('execute')
  })

  it('routes an unowned task to the lead for assignment', () => {
    expect(deriveTaskAction(mk('a', 'todo', { assigneeId: null }), [])).toEqual({ nextAction: 'assign_owner', actionOwner: 'lead' })
  })

  it('routes a rejected-but-retry task (todo + reviewNote + retry>0) to apply_changes/owner', () => {
    expect(deriveTaskAction(mk('a', 'todo', { reviewNote: 'refazer', retryCount: 1 }), []))
      .toEqual({ nextAction: 'apply_changes', actionOwner: 'owner' })
  })

  it('re-runs a blocked task whose deps finished, but keeps waiting otherwise', () => {
    const done = [mk('dep', 'done'), mk('a', 'blocked', { dependsOn: ['dep'] })]
    expect(deriveTaskAction(done[1], done).nextAction).toBe('execute')
    const pend = [mk('dep', 'todo'), mk('a', 'blocked', { dependsOn: ['dep'] })]
    expect(deriveTaskAction(pend[1], pend).nextAction).toBe('wait_dependency')
  })
})

describe('buildAgenda — one classified item per task', () => {
  it('classifies every task in board order and carries the task', () => {
    const board = [mk('done', 'done'), mk('rev', 'review'), mk('run', 'todo')]
    const agenda = buildAgenda(board)
    expect(agenda).toHaveLength(3)
    expect(agenda.map(i => i.nextAction)).toEqual(['terminal', 'review', 'execute'])
    expect(agenda[1].task.id).toBe('rev')
  })
})
