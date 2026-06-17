/**
 * IDOR regression tests for /api/integrations/[id] (Sprint 0 — seguranca P0).
 *
 * Escopa por `userId: ownerId(auth)` (campo `userId`, NAO `createdBy`). Admin
 * recebe `userId: undefined` (bypass). DELETE usa `deleteMany` + checagem de
 * `count` (delete atomico escopado por dono). Envelope `{ error }`.
 */
jest.mock('@/lib/auth', () => ({ getAuthFromRequest: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    integration: { findFirst: jest.fn(), deleteMany: jest.fn(), update: jest.fn() },
  },
}))

import { GET, DELETE } from '@/app/api/integrations/[id]/route'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

const mockGetAuth = getAuthFromRequest as jest.MockedFunction<typeof getAuthFromRequest>
const mockFindFirst = prisma.integration.findFirst as jest.Mock
const mockDeleteMany = prisma.integration.deleteMany as jest.Mock

const OWNER = { id: 'owner-1', email: 'o@e.com', name: 'Owner', role: 'user' }
const OTHER = { id: 'other-1', email: 'x@e.com', name: 'Other', role: 'user' }
const ADMIN = { id: 'admin-1', email: 'a@e.com', name: 'Admin', role: 'admin' }

function req(method = 'GET') {
  return new NextRequest('http://localhost/api/integrations/int-1', { method })
}
const ctx = { params: Promise.resolve({ id: 'int-1' }) }

beforeEach(() => jest.clearAllMocks())

describe('GET /api/integrations/[id] — ownership', () => {
  it('returns 404 and scopes by userId for a non-owner', async () => {
    mockGetAuth.mockResolvedValueOnce(OTHER as any)
    mockFindFirst.mockResolvedValueOnce(null)

    const res = await GET(req(), ctx)
    expect(res.status).toBe(404)
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'int-1', userId: 'other-1' }) })
    )
  })

  it('lets an admin bypass the owner filter (userId undefined)', async () => {
    mockGetAuth.mockResolvedValueOnce(ADMIN as any)
    mockFindFirst.mockResolvedValueOnce({ id: 'int-1', credentials: {} })

    const res = await GET(req(), ctx)
    expect(res.status).toBe(200)
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: undefined }) })
    )
  })

  it('does not leak raw credentials in the response', async () => {
    mockGetAuth.mockResolvedValueOnce(OWNER as any)
    mockFindFirst.mockResolvedValueOnce({ id: 'int-1', credentials: { token: 'secret' } })

    const res = await GET(req(), ctx)
    const body = await res.json()
    expect(body.credentials).toBeUndefined()
    expect(body.hasCredentials).toBe(true)
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetAuth.mockResolvedValueOnce(null)
    const res = await GET(req(), ctx)
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/integrations/[id] — ownership', () => {
  it('returns 404 when nothing was deleted (not the owner)', async () => {
    mockGetAuth.mockResolvedValueOnce(OTHER as any)
    mockDeleteMany.mockResolvedValueOnce({ count: 0 })

    const res = await DELETE(req('DELETE'), ctx)
    expect(res.status).toBe(404)
    expect(mockDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'int-1', userId: 'other-1' }) })
    )
  })

  it('returns 200 when the owner deletes it', async () => {
    mockGetAuth.mockResolvedValueOnce(OWNER as any)
    mockDeleteMany.mockResolvedValueOnce({ count: 1 })

    const res = await DELETE(req('DELETE'), ctx)
    expect(res.status).toBe(200)
  })
})
