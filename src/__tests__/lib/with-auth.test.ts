/**
 * Unit tests for the withAuth() HOF (Sprint 1).
 */

jest.mock('@/lib/auth', () => ({
  getAuthFromRequest: jest.fn(),
}))

import { withAuth } from '@/lib/with-auth'
import { getAuthFromRequest } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

const mockGetAuth = getAuthFromRequest as jest.MockedFunction<typeof getAuthFromRequest>
const MOCK_USER = { id: 'user-1', email: 'a@b.com', name: 'Test', role: 'user' }

function req(url = 'http://localhost/api/x') {
  return new NextRequest(url, { method: 'GET' })
}

beforeEach(() => jest.clearAllMocks())

describe('withAuth', () => {
  it('returns 401 with default envelope when unauthenticated, without calling the handler', async () => {
    mockGetAuth.mockResolvedValueOnce(null)
    const handler = jest.fn()
    const wrapped = withAuth(handler as any)

    const res = await wrapped(req())
    expect(res.status).toBe(401)
    const body = await (res as Response).json()
    expect(body).toEqual({ success: false, error: 'Unauthorized' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('uses a custom onUnauthorized envelope when provided', async () => {
    mockGetAuth.mockResolvedValueOnce(null)
    const wrapped = withAuth(async () => NextResponse.json({ ok: true }), {
      onUnauthorized: () => NextResponse.json({ data: null, error: 'Não autenticado' }, { status: 401 }),
    })

    const res = await wrapped(req())
    expect(res.status).toBe(401)
    const body = await (res as Response).json()
    expect(body).toEqual({ data: null, error: 'Não autenticado' })
  })

  it('injects auth and the context into the handler when authenticated', async () => {
    mockGetAuth.mockResolvedValueOnce(MOCK_USER)
    const handler = jest.fn(async (_req, auth, ctx) =>
      NextResponse.json({ id: auth.id, ctx })
    )
    const wrapped = withAuth(handler as any)

    const context = { params: Promise.resolve({ id: 'abc' }) }
    const res = await wrapped(req(), context as any)
    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledTimes(1)
    // handler receives (request, auth, context)
    expect(handler.mock.calls[0][1]).toEqual(MOCK_USER)
    expect(handler.mock.calls[0][2]).toBe(context)
  })
})
