/**
 * IDOR regression tests for /api/ab-tests/[id] (Sprint 0 — seguranca P0).
 *
 * Usa `ownerId(auth)` no `where`: dono filtra por `createdBy = auth.id`, admin
 * recebe `createdBy: undefined` (Prisma ignora → enxerga tudo). Envelope `{ error }`.
 */
jest.mock('@/lib/auth', () => ({ getAuthFromRequest: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    aBTest: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
    agent: { findUnique: jest.fn() },
  },
}))

import { GET, DELETE } from '@/app/api/ab-tests/[id]/route'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

const mockGetAuth = getAuthFromRequest as jest.MockedFunction<typeof getAuthFromRequest>
const mockFindFirst = prisma.aBTest.findFirst as jest.Mock
const mockDelete = prisma.aBTest.delete as jest.Mock
const mockAgentFindUnique = prisma.agent.findUnique as jest.Mock

const OWNER = { id: 'owner-1', email: 'o@e.com', name: 'Owner', role: 'user' }
const OTHER = { id: 'other-1', email: 'x@e.com', name: 'Other', role: 'user' }
const ADMIN = { id: 'admin-1', email: 'a@e.com', name: 'Admin', role: 'admin' }

function req(method = 'GET') {
  return new NextRequest('http://localhost/api/ab-tests/test-1', { method })
}
const ctx = { params: Promise.resolve({ id: 'test-1' }) }

beforeEach(() => jest.clearAllMocks())

describe('GET /api/ab-tests/[id] — ownership', () => {
  it('returns 404 and scopes by createdBy for a non-owner', async () => {
    mockGetAuth.mockResolvedValueOnce(OTHER as any)
    mockFindFirst.mockResolvedValueOnce(null)

    const res = await GET(req(), ctx)
    expect(res.status).toBe(404)
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'test-1', createdBy: 'other-1' }) })
    )
  })

  it('lets an admin bypass the owner filter (createdBy undefined → sees all)', async () => {
    mockGetAuth.mockResolvedValueOnce(ADMIN as any)
    mockFindFirst.mockResolvedValueOnce({ id: 'test-1', agentAId: 'a', agentBId: 'b', interactions: [] })
    mockAgentFindUnique.mockResolvedValue({ name: 'X', description: '' })

    const res = await GET(req(), ctx)
    expect(res.status).toBe(200)
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ createdBy: undefined }) })
    )
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetAuth.mockResolvedValueOnce(null)
    const res = await GET(req(), ctx)
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/ab-tests/[id] — ownership', () => {
  it('returns 404 and does not delete for a non-owner', async () => {
    mockGetAuth.mockResolvedValueOnce(OTHER as any)
    mockFindFirst.mockResolvedValueOnce(null)

    const res = await DELETE(req('DELETE'), ctx)
    expect(res.status).toBe(404)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('deletes the test for its owner', async () => {
    mockGetAuth.mockResolvedValueOnce(OWNER as any)
    mockFindFirst.mockResolvedValueOnce({ id: 'test-1', createdBy: 'owner-1' })
    mockDelete.mockResolvedValueOnce({ id: 'test-1' })

    const res = await DELETE(req('DELETE'), ctx)
    expect(res.status).toBe(200)
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'test-1' } })
  })
})
