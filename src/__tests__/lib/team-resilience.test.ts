/**
 * Unit tests for src/lib/orchestration/team/team-resilience.ts (Feature 008).
 * Mocks @/lib/prisma; uses the real isClaudeRateLimit/ClaudeRateLimitError/parseResetAt.
 */
jest.mock('@/lib/prisma', () => ({
  prisma: {
    teamRun: { update: jest.fn(), updateMany: jest.fn() },
    teamTask: { updateMany: jest.fn() },
  },
}))

import { withRateLimitCapture, isResumable, resetRunForResume } from '@/lib/orchestration/team/team-resilience'
import { ClaudeRateLimitError } from '@/lib/ai/claude-token-pool'
import type { ChatFn, ChatResult } from '@/lib/orchestration/team/team-types'
import { prisma } from '@/lib/prisma'

const update = prisma.teamRun.update as jest.Mock
const updateMany = prisma.teamRun.updateMany as jest.Mock
const taskUpdateMany = prisma.teamTask.updateMany as jest.Mock

const OK: ChatResult = { message: 'ok', model: 'claude-sonnet-4-6', usage: null }
const call = (fn: ChatFn) => fn('agent', [] as never, undefined, { runId: 'r1' } as never)

beforeEach(() => { update.mockReset(); updateMany.mockReset(); taskUpdateMany.mockReset() })

describe('isResumable', () => {
  it('true only for rate_limited', () => {
    expect(isResumable({ status: 'rate_limited' })).toBe(true)
    expect(isResumable({ status: 'completed' })).toBe(false)
    expect(isResumable({ status: 'failed' })).toBe(false)
  })
})

describe('withRateLimitCapture', () => {
  it('passthrough on success (no DB write)', async () => {
    const inner = jest.fn().mockResolvedValue(OK) as unknown as ChatFn
    const r = await call(withRateLimitCapture(inner))
    expect(r.message).toBe('ok')
    expect(update).not.toHaveBeenCalled()
  })

  it('re-throws rate-limit and records resetAt', async () => {
    const err = new ClaudeRateLimitError("You've hit your session limit · resets 5pm (UTC)")
    const inner = jest.fn().mockRejectedValue(err) as unknown as ChatFn
    update.mockResolvedValue({})
    await expect(call(withRateLimitCapture(inner))).rejects.toBe(err)
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'r1' } }))
  })

  it('re-throws a non-limit error WITHOUT recording', async () => {
    const err = new Error('erro de compilação')
    const inner = jest.fn().mockRejectedValue(err) as unknown as ChatFn
    await expect(call(withRateLimitCapture(inner))).rejects.toBe(err)
    expect(update).not.toHaveBeenCalled()
  })
})

describe('resetRunForResume', () => {
  it('returns false when run is no longer rate_limited (atomic guard)', async () => {
    updateMany.mockResolvedValue({ count: 0 })
    expect(await resetRunForResume('r1')).toBe(false)
    expect(taskUpdateMany).not.toHaveBeenCalled()
  })

  it('resets doing→todo and returns true', async () => {
    updateMany.mockResolvedValue({ count: 1 })
    taskUpdateMany.mockResolvedValue({ count: 2 })
    expect(await resetRunForResume('r1')).toBe(true)
    expect(taskUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { runId: 'r1', status: 'doing' }, data: { status: 'todo' } }),
    )
  })
})
