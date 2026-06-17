// src/__tests__/lib/team/team-board.test.ts
import {
  resolveMemberByName, resolveAssignee, isBoardSettled, isRateLimit,
} from '@/lib/orchestration/team/team-board'
import type { MemberCtx, TaskRow } from '@/lib/orchestration/team/team-types'

const worker = (id: string, name: string): MemberCtx =>
  ({ id, agentId: `a-${id}`, agentName: name, role: 'worker', model: null, effort: null })

const task = (status: TaskRow['status']): TaskRow =>
  ({ id: 't', title: 'x', body: null, status, assigneeId: null, result: null, reviewNote: null, retryCount: 0, position: 0, dependsOn: [] })

describe('resolveMemberByName', () => {
  it('matches case-insensitively, ignoring surrounding space', () => {
    const ms = [worker('1', 'Ana'), worker('2', 'Bob')]
    expect(resolveMemberByName(ms, '  ana ')?.id).toBe('1')
  })
  it('returns null when no match', () => {
    expect(resolveMemberByName([worker('1', 'Ana')], 'Zoe')).toBeNull()
  })
})

describe('resolveAssignee', () => {
  const workers = [worker('1', 'Ana'), worker('2', 'Bob')]
  it('resolves a name target to that worker', () => {
    expect(resolveAssignee(workers, { kind: 'name', value: 'Bob' }, 0)?.id).toBe('2')
  })
  it('falls back to round-robin by seed when name is unknown', () => {
    expect(resolveAssignee(workers, { kind: 'name', value: 'Zoe' }, 0)?.id).toBe('1')
    expect(resolveAssignee(workers, { kind: 'name', value: 'Zoe' }, 1)?.id).toBe('2')
  })
  it('round-robins for a role target', () => {
    expect(resolveAssignee(workers, { kind: 'role', value: 'worker' }, 3)?.id).toBe('2')
  })
  it('round-robins when no target given', () => {
    expect(resolveAssignee(workers, undefined, 2)?.id).toBe('1')
  })
  it('returns null when there are no workers', () => {
    expect(resolveAssignee([], undefined, 0)).toBeNull()
  })
})

describe('isBoardSettled', () => {
  it('false for empty board', () => {
    expect(isBoardSettled([])).toBe(false)
  })
  it('true when every task is done or rejected', () => {
    expect(isBoardSettled([task('done'), task('rejected')])).toBe(true)
  })
  it('false when any task is still active', () => {
    expect(isBoardSettled([task('done'), task('review')])).toBe(false)
  })
})

describe('isRateLimit', () => {
  it('detects common rate-limit phrasings and 429', () => {
    expect(isRateLimit(new Error('Request failed: 429 Too Many Requests'))).toBe(true)
    expect(isRateLimit(new Error('You hit your limit'))).toBe(true)
  })
  it('false for ordinary errors', () => {
    expect(isRateLimit(new Error('boom'))).toBe(false)
  })
})
