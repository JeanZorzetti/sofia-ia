/**
 * 011-byos — ALS override propagation (Phase 2, T005).
 * The override must survive the whole async tree of a run, be absent outside any
 * context, and keep nested/concurrent runs isolated (two users' runs never leak).
 */
import { runWithClaudeToken, currentClaudeTokenOverride } from '@/lib/ai/claude-token-override'

describe('claude-token-override (AsyncLocalStorage)', () => {
  it('is undefined outside any override context', () => {
    expect(currentClaudeTokenOverride()).toBeUndefined()
  })

  it('propagates through awaits, timers and nested async fns', async () => {
    await runWithClaudeToken('tok-A', async () => {
      await Promise.resolve()
      await new Promise((r) => setTimeout(r, 1))
      expect(currentClaudeTokenOverride()).toBe('tok-A')
      const deep = async () => currentClaudeTokenOverride()
      expect(await deep()).toBe('tok-A')
    })
    // cleared once the context exits
    expect(currentClaudeTokenOverride()).toBeUndefined()
  })

  it('nested contexts shadow the outer, then restore it', async () => {
    await runWithClaudeToken('outer', async () => {
      expect(currentClaudeTokenOverride()).toBe('outer')
      await runWithClaudeToken('inner', async () => {
        expect(currentClaudeTokenOverride()).toBe('inner')
      })
      expect(currentClaudeTokenOverride()).toBe('outer')
    })
  })

  it('concurrent contexts stay isolated (no cross-run leak)', async () => {
    const seen: Record<string, string | undefined> = {}
    await Promise.all([
      runWithClaudeToken('A', async () => {
        await new Promise((r) => setTimeout(r, 5))
        seen.A = currentClaudeTokenOverride()
      }),
      runWithClaudeToken('B', async () => {
        await new Promise((r) => setTimeout(r, 1))
        seen.B = currentClaudeTokenOverride()
      }),
    ])
    expect(seen).toEqual({ A: 'A', B: 'B' })
  })
})
