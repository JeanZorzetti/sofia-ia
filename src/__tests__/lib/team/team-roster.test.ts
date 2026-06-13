// src/__tests__/lib/team/team-roster.test.ts
import { validateRoster } from '@/lib/orchestration/team/team-roster'

const M = (role: string, agentId = 'a') => ({ agentId, role })

describe('validateRoster', () => {
  it('accepts 1 lead + 1 worker', () => {
    expect(validateRoster([M('lead'), M('worker')])).toBeNull()
  })
  it('accepts 1 lead + worker + reviewer', () => {
    expect(validateRoster([M('lead'), M('worker'), M('reviewer')])).toBeNull()
  })
  it('rejects empty roster', () => {
    expect(validateRoster([])).toMatch(/vazio/i)
  })
  it('requires exactly one lead', () => {
    expect(validateRoster([M('worker')])).toMatch(/lead/i)
    expect(validateRoster([M('lead'), M('lead'), M('worker')])).toMatch(/lead/i)
  })
  it('requires at least one worker', () => {
    expect(validateRoster([M('lead')])).toMatch(/worker/i)
  })
  it('rejects more than one reviewer', () => {
    expect(validateRoster([M('lead'), M('worker'), M('reviewer'), M('reviewer')])).toMatch(/reviewer/i)
  })
  it('rejects invalid role', () => {
    expect(validateRoster([M('lead'), M('boss')])).toMatch(/papel/i)
  })
  it('rejects a member missing agentId', () => {
    expect(validateRoster([M('lead'), { role: 'worker', agentId: '' }])).toMatch(/agentId/i)
  })
})
