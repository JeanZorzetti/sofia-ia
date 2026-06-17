/**
 * Tests for POST /api/auth/register (Sprint 5).
 *
 * Cobre validacao zod (400, senha < 8), email ja em uso (409) e o caminho feliz
 * (201 cria o usuario + assinatura trial Pro de 7 dias). `parseJson`/
 * `registerSchema` rodam de verdade; prisma, bcrypt, auth, email e analytics sao
 * mockados. Os fire-and-forget (email/analytics) precisam devolver Promise.
 */
jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('hashed-pw') }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn() },
    subscription: { create: jest.fn() },
  },
}))
jest.mock('@/lib/auth', () => ({ signToken: jest.fn(), setAuthCookie: jest.fn() }))
jest.mock('@/lib/email', () => ({ sendWelcomeEmail: jest.fn(() => Promise.resolve()) }))
jest.mock('@/lib/analytics', () => ({
  trackEvent: jest.fn(() => Promise.resolve()),
  Events: { SIGNUP: 'signup' },
}))

import { POST } from '@/app/api/auth/register/route'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { NextRequest } from 'next/server'

const mockFindUnique = prisma.user.findUnique as jest.Mock
const mockUserCreate = prisma.user.create as jest.Mock
const mockSubscriptionCreate = prisma.subscription.create as jest.Mock
const mockSignToken = signToken as jest.Mock

function req(body: object) {
  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID = { name: 'Alice', email: 'alice@example.com', password: 'password123' }

beforeEach(() => jest.clearAllMocks())

describe('POST /api/auth/register', () => {
  it('returns 400 when the password is too short (zod)', async () => {
    const res = await POST(req({ name: 'Alice', email: 'alice@example.com', password: 'short' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('password')
  })

  it('returns 409 when the email is already in use', async () => {
    mockFindUnique.mockResolvedValueOnce({ id: 'existing', email: 'alice@example.com' })

    const res = await POST(req(VALID))
    expect(res.status).toBe(409)
    expect(mockUserCreate).not.toHaveBeenCalled()
  })

  it('returns 201 and creates the user plus a 7-day Pro trial', async () => {
    mockFindUnique.mockResolvedValueOnce(null)
    mockUserCreate.mockResolvedValueOnce({ id: 'u1', email: 'alice@example.com', name: 'Alice', role: 'user' })
    mockSubscriptionCreate.mockResolvedValueOnce({ id: 'sub1' })
    mockSignToken.mockResolvedValueOnce('jwt-token')

    const res = await POST(req(VALID))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.token).toBe('jwt-token')

    expect(mockUserCreate).toHaveBeenCalledTimes(1)
    expect(mockSubscriptionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'u1', plan: 'pro', status: 'trialing' }),
      })
    )
  })
})
