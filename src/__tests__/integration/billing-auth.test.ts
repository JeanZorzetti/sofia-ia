/**
 * @jest-environment node
 *
 * 013-cobranca-stripe — auth, input validation and webhook fail-closed/dedupe (T021, T027).
 * Constituição V: rotas autenticadas escopadas por auth.id; webhook com assinatura e dedupe por evt_id.
 */
jest.mock('@/lib/auth', () => ({ getAuthFromRequest: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    subscription: { findUnique: jest.fn() },
    termsAcceptance: { create: jest.fn() },
    stripeEvent: { create: jest.fn(), delete: jest.fn() },
  },
}))
jest.mock('@/lib/stripe', () => ({
  getStripe: jest.fn(),
  ensureCustomer: jest.fn(),
  priceIdFor: jest.fn(() => 'price_pro'),
  syncSubscription: jest.fn(),
  appUrl: () => 'http://localhost',
  isStripeConfigured: () => true,
}))
jest.mock('@/lib/email', () => ({
  sendWithdrawalEmail: jest.fn(),
  sendCancellationScheduledEmail: jest.fn(),
  sendSubscriptionEndedEmail: jest.fn(),
  sendBillingAlertToTeam: jest.fn(),
}))

import { Prisma } from '@prisma/client'
import { NextRequest } from 'next/server'
import { POST as checkout } from '@/app/api/billing/checkout/route'
import { POST as portal } from '@/app/api/billing/portal/route'
import { POST as withdraw } from '@/app/api/billing/withdraw/route'
import { POST as webhook } from '@/app/api/webhooks/stripe/route'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureCustomer, getStripe, syncSubscription } from '@/lib/stripe'

const mockAuth = getAuthFromRequest as jest.MockedFunction<typeof getAuthFromRequest>
const subFind = prisma.subscription.findUnique as jest.Mock
const eventCreate = prisma.stripeEvent.create as jest.Mock
const mockGetStripe = getStripe as jest.Mock
const mockSync = syncSubscription as jest.Mock
const mockEnsureCustomer = ensureCustomer as jest.Mock

const USER = { id: 'user-1', email: 'u@e.com', name: 'User', role: 'user' }

function req(path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
  })
}

beforeAll(() => {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
})
beforeEach(() => jest.clearAllMocks())

describe('POST /api/billing/checkout', () => {
  it('401 without session', async () => {
    mockAuth.mockResolvedValueOnce(null)
    expect((await checkout(req('/api/billing/checkout', { plan: 'pro' }))).status).toBe(401)
  })

  it('400 invalid_tax_id and never touches Stripe', async () => {
    mockAuth.mockResolvedValueOnce(USER as never)
    const res = await checkout(req('/api/billing/checkout', { plan: 'pro', taxId: '111.111.111-11', acceptedTermsVersion: 'v2' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_tax_id')
    expect(mockEnsureCustomer).not.toHaveBeenCalled()
    expect(mockGetStripe).not.toHaveBeenCalled()
  })

  it('400 terms_not_accepted for an outdated terms version', async () => {
    mockAuth.mockResolvedValueOnce(USER as never)
    const res = await checkout(req('/api/billing/checkout', { plan: 'pro', taxId: '529.982.247-25', acceptedTermsVersion: 'v1' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('terms_not_accepted')
    expect(prisma.termsAcceptance.create).not.toHaveBeenCalled()
  })
})

describe('POST /api/billing/portal and /withdraw', () => {
  it('401 without session', async () => {
    mockAuth.mockResolvedValue(null)
    expect((await portal(req('/api/billing/portal'))).status).toBe(401)
    expect((await withdraw(req('/api/billing/withdraw'))).status).toBe(401)
    mockAuth.mockReset()
  })

  it('withdraw is 409 after the 7-day window', async () => {
    mockAuth.mockResolvedValueOnce(USER as never)
    subFind.mockResolvedValueOnce({
      plan: 'pro',
      status: 'active',
      stripeSubscriptionId: 'sub_1',
      startedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      user: { email: USER.email },
    })
    const res = await withdraw(req('/api/billing/withdraw'))
    expect(res.status).toBe(409)
    expect(mockGetStripe).not.toHaveBeenCalled()
  })
})

describe('POST /api/webhooks/stripe', () => {
  const event = { id: 'evt_1', type: 'customer.subscription.updated', data: { object: { id: 'sub_1' } } }

  it('400 without signature, nothing recorded', async () => {
    const res = await webhook(req('/api/webhooks/stripe', '{}'))
    expect(res.status).toBe(400)
    expect(eventCreate).not.toHaveBeenCalled()
  })

  it('400 with an invalid signature', async () => {
    mockGetStripe.mockReturnValue({ webhooks: { constructEvent: () => { throw new Error('bad sig') } } })
    const res = await webhook(req('/api/webhooks/stripe', '{}', { 'stripe-signature': 't=1,v1=x' }))
    expect(res.status).toBe(400)
    expect(eventCreate).not.toHaveBeenCalled()
  })

  it('processes an event id only once', async () => {
    mockGetStripe.mockReturnValue({ webhooks: { constructEvent: () => event } })
    mockSync.mockResolvedValue(null)
    eventCreate
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '5.22.0' }))

    const first = await webhook(req('/api/webhooks/stripe', '{}', { 'stripe-signature': 't=1,v1=x' }))
    const second = await webhook(req('/api/webhooks/stripe', '{}', { 'stripe-signature': 't=1,v1=x' }))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect((await second.json()).duplicate).toBe(true)
    expect(mockSync).toHaveBeenCalledTimes(1)
    expect(mockSync).toHaveBeenCalledWith('sub_1')
  })
})
