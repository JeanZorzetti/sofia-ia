/**
 * Unit tests for the consolidated rate-limit module (Sprint 1).
 */

import { rateLimit, RateLimiter, MemoryStore } from '@/lib/rate-limit'

describe('rateLimit (sync, in-memory)', () => {
  it('allows up to maxRequests then blocks', () => {
    const key = `test-${Date.now()}-${Math.random()}`
    const a = rateLimit(key, 2, 60_000)
    const b = rateLimit(key, 2, 60_000)
    const c = rateLimit(key, 2, 60_000)

    expect(a.allowed).toBe(true)
    expect(a.remaining).toBe(1)
    expect(b.allowed).toBe(true)
    expect(b.remaining).toBe(0)
    expect(c.allowed).toBe(false)
    expect(c.remaining).toBe(0)
  })
})

describe('RateLimiter (async, adapter-based)', () => {
  it('allows up to maxRequests then blocks, with a MemoryStore adapter', async () => {
    const limiter = new RateLimiter(
      { windowMs: 60_000, maxRequests: 2, keyPrefix: `t-${Date.now()}-${Math.random()}:` },
      new MemoryStore(),
    )
    const key = 'user-1'

    const a = await limiter.check(key)
    const b = await limiter.check(key)
    const c = await limiter.check(key)

    expect(a.allowed).toBe(true)
    expect(a.limit).toBe(2)
    expect(a.remaining).toBe(1)
    expect(b.allowed).toBe(true)
    expect(b.remaining).toBe(0)
    expect(c.allowed).toBe(false)
    expect(c.remaining).toBe(0)
    expect(typeof c.retryAfter).toBe('number')
  })
})
