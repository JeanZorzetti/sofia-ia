/**
 * Unit tests for the single plan rule (spec 013, research R4).
 */

import { resolvePlan, trialEndsAt } from '@/lib/plan-limits'

const now = new Date('2026-10-01T12:00:00Z')
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000)
const paid = (plan: string, status: string) => ({ plan, status, stripeSubscriptionId: 'sub_123' })

describe('resolvePlan', () => {
  it('returns the paid plan for an active Stripe subscription', () => {
    expect(resolvePlan({ sub: paid('business', 'active'), userCreatedAt: daysAgo(90), now })).toBe('business')
  })

  it('keeps the plan while past_due (grace period)', () => {
    expect(resolvePlan({ sub: paid('pro', 'past_due'), userCreatedAt: daysAgo(90), now })).toBe('pro')
  })

  it('drops a canceled or unpaid subscription to free after the trial window', () => {
    expect(resolvePlan({ sub: paid('pro', 'canceled'), userCreatedAt: daysAgo(90), now })).toBe('free')
    expect(resolvePlan({ sub: paid('pro', 'unpaid'), userCreatedAt: daysAgo(90), now })).toBe('free')
  })

  it('gives a 7-day Pro trial from signup to every user, with or without a row', () => {
    expect(resolvePlan({ sub: null, userCreatedAt: daysAgo(6), now })).toBe('pro')
    expect(resolvePlan({ sub: null, userCreatedAt: daysAgo(8), now })).toBe('free')
    expect(trialEndsAt(daysAgo(7)).getTime()).toBe(now.getTime())
    expect(resolvePlan({ sub: null, userCreatedAt: daysAgo(7), now })).toBe('free')
  })

  it('ignores legacy Mercado Pago rows (no Stripe subscription id)', () => {
    const legacy = { plan: 'pro', status: 'trialing', stripeSubscriptionId: null }
    expect(resolvePlan({ sub: legacy, userCreatedAt: daysAgo(120), now })).toBe('free')
    const freeRow = { plan: 'free', status: 'active', stripeSubscriptionId: null }
    expect(resolvePlan({ sub: freeRow, userCreatedAt: daysAgo(2), now })).toBe('pro')
  })
})
