/**
 * Tests for POST /api/auth/login (Sprint 5).
 *
 * Cobre os portoes do login: rate-limit (429), validacao zod do body (400 com o
 * campo `username`), credenciais invalidas (401) e sucesso (200). `parseJson` e o
 * `loginSchema` rodam de verdade; auth e rate-limit sao mockados.
 */
jest.mock('@/lib/auth', () => ({ authenticateUser: jest.fn(), setAuthCookie: jest.fn() }))
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn(),
  RATE_LIMITS: { auth: { max: 5, window: 15 * 60 * 1000 } },
}))

import { POST } from '@/app/api/auth/login/route'
import { authenticateUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { NextRequest } from 'next/server'

const mockAuthenticate = authenticateUser as jest.Mock
const mockRateLimit = rateLimit as jest.Mock

function req(body?: object) {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

const allow = () => mockRateLimit.mockReturnValueOnce({ allowed: true, remaining: 4, resetAt: Date.now() + 1000 })

beforeEach(() => jest.clearAllMocks())

describe('POST /api/auth/login', () => {
  it('returns 429 when rate-limited (before touching credentials)', async () => {
    mockRateLimit.mockReturnValueOnce({ allowed: false, resetAt: Date.now() + 1000 })

    const res = await POST(req({ username: 'a@e.com', password: 'pw' }))
    expect(res.status).toBe(429)
    expect(mockAuthenticate).not.toHaveBeenCalled()
  })

  it('returns 400 when the body fails zod validation (missing username)', async () => {
    allow()
    const res = await POST(req({ password: 'pw' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('username')
  })

  it('returns 401 on invalid credentials', async () => {
    allow()
    mockAuthenticate.mockResolvedValueOnce(null)

    const res = await POST(req({ username: 'a@e.com', password: 'wrong' }))
    expect(res.status).toBe(401)
  })

  it('returns 200 and a token on success', async () => {
    allow()
    mockAuthenticate.mockResolvedValueOnce({
      token: 'jwt-token',
      user: { id: 'u1', email: 'a@e.com', name: 'A', role: 'user' },
    })

    const res = await POST(req({ username: 'a@e.com', password: 'right' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.token).toBe('jwt-token')
    expect(body.data.user.id).toBe('u1')
  })
})
