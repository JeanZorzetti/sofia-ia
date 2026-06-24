/**
 * Unit tests for src/lib/companies/company-resilience.ts (Feature 007).
 * Pure logic — no DB. Asserts INV-1..8 of contracts/resilience-contract.md.
 */
import {
  isPhaseExhausted,
  parseResetAt,
  computeUsageProxy,
  MODEL_WEIGHT,
} from '@/lib/companies/company-resilience'

describe('company-resilience helpers', () => {
  describe('isPhaseExhausted', () => {
    it('INV-1: completed run whose output carries the limit signature → exhausted', () => {
      expect(
        isPhaseExhausted({ status: 'completed', output: 'Erro na execução do Claude CLI: Todas as 3 contas no limite. resets 5pm (UTC)' }),
      ).toBe(true)
    })
    it('INV-2: rate_limited status → exhausted (even with null output)', () => {
      expect(isPhaseExhausted({ status: 'rate_limited', output: null })).toBe(true)
    })
    it('INV-3: completed run with a legit answer mentioning "rate limiter" → NOT exhausted', () => {
      expect(isPhaseExhausted({ status: 'completed', output: 'Entreguei o código do rate limiter e os testes.' })).toBe(false)
    })
    it('INV-4: a real (non-limit) failure → NOT exhausted', () => {
      expect(isPhaseExhausted({ status: 'failed', output: 'erro de compilação no módulo X' })).toBe(false)
    })
  })

  describe('parseResetAt', () => {
    const now = new Date('2026-06-24T13:15:00.000Z') // 1:15pm UTC
    it('INV-5: "resets 4:30pm (UTC)" → today 16:30Z (still in the future)', () => {
      const d = parseResetAt('You\'ve hit your session limit · resets 4:30pm (UTC)', now)
      expect(d?.toISOString()).toBe('2026-06-24T16:30:00.000Z')
    })
    it('past reset rolls to next day', () => {
      const d = parseResetAt('resets 10am (UTC)', now) // 10:00 < 13:15 → +1 day
      expect(d?.toISOString()).toBe('2026-06-25T10:00:00.000Z')
    })
    it('handles 24h format "resets 16:30 (UTC)"', () => {
      expect(parseResetAt('resets 16:30 (UTC)', now)?.toISOString()).toBe('2026-06-24T16:30:00.000Z')
    })
    it('INV-6: no reset in text → null', () => {
      expect(parseResetAt('limite atingido, tente mais tarde', now)).toBeNull()
      expect(parseResetAt(null, now)).toBeNull()
    })
  })

  describe('computeUsageProxy / MODEL_WEIGHT', () => {
    it('INV-8: opus weighs 5, sonnet weighs 1', () => {
      expect(MODEL_WEIGHT('claude-opus-4-8')).toBe(5)
      expect(MODEL_WEIGHT('claude-sonnet-4-6')).toBe(1)
      expect(MODEL_WEIGHT(null)).toBe(1)
    })
    it('INV-7: turns × weight per member → weightedUnits', () => {
      const u = computeUsageProxy({
        turnsUsed: 1, durationMs: 1000,
        members: [{ model: 'claude-opus-4-8' }, { model: 'claude-sonnet-4-6' }],
        blocked: false,
      })
      expect(u.weightedUnits).toBe(6) // 1*5 + 1*1
      expect(u.byModel['claude-opus-4-8']).toBe(5)
      expect(u.byModel['claude-sonnet-4-6']).toBe(1)
      expect(u.blocked).toBe(false)
    })
    it('defaults turns to 1 when null and flags blocked', () => {
      const u = computeUsageProxy({ turnsUsed: null, durationMs: null, members: [{ model: 'claude-sonnet-4-6' }], blocked: true })
      expect(u.turns).toBe(1)
      expect(u.weightedUnits).toBe(1)
      expect(u.blocked).toBe(true)
    })
  })
})
