/**
 * IDOR regression tests for /api/conversations/[id] (Sprint 0 — seguranca P0).
 *
 * A posse e indireta: a conversa pertence a um agente cujo `createdBy` deve ser
 * o usuario atual. O filtro vive na relacao (`agent: { createdBy: auth.id }`),
 * entao um nao-dono recebe 404.
 */
jest.mock('@/lib/auth', () => ({ getAuthFromRequest: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: { conversation: { findFirst: jest.fn() } },
}))

import { GET } from '@/app/api/conversations/[id]/route'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

const mockGetAuth = getAuthFromRequest as jest.MockedFunction<typeof getAuthFromRequest>
const mockFindFirst = prisma.conversation.findFirst as jest.Mock

const OWNER = { id: 'owner-1', email: 'o@e.com', name: 'Owner', role: 'user' }
const OTHER = { id: 'other-1', email: 'x@e.com', name: 'Other', role: 'user' }

function req() {
  return new NextRequest('http://localhost/api/conversations/conv-1')
}
const ctx = { params: Promise.resolve({ id: 'conv-1' }) }

beforeEach(() => jest.clearAllMocks())

describe('GET /api/conversations/[id] — ownership (via agent.createdBy)', () => {
  it('returns 404 and scopes the query by the owning agent for a non-owner', async () => {
    mockGetAuth.mockResolvedValueOnce(OTHER as any)
    mockFindFirst.mockResolvedValueOnce(null)

    const res = await GET(req(), ctx)
    expect(res.status).toBe(404)
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'conv-1', agent: { createdBy: 'other-1' } }),
      })
    )
  })

  it('returns the conversation to its owner', async () => {
    mockGetAuth.mockResolvedValueOnce(OWNER as any)
    mockFindFirst.mockResolvedValueOnce({ id: 'conv-1', lead: null })

    const res = await GET(req(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('conv-1')
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetAuth.mockResolvedValueOnce(null)
    const res = await GET(req(), ctx)
    expect(res.status).toBe(401)
  })
})
