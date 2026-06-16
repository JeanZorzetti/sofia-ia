/**
 * IDOR regression tests for /api/agents/[id] (Sprint 0 — segurança P0).
 *
 * Garante que recursos sejam escopados por dono: um não-dono recebe 404
 * (a query inclui o filtro de dono e o Prisma retorna null), e que o admin
 * não tem o filtro aplicado (vê tudo).
 */
jest.mock('@/lib/auth', () => ({ getAuthFromRequest: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    agent: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))
jest.mock('@/lib/audit', () => ({
  logAudit: jest.fn(),
  getIpFromRequest: jest.fn(),
  getUserAgentFromRequest: jest.fn(),
}))

import { GET, DELETE } from '@/app/api/agents/[id]/route'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

const mockGetAuth = getAuthFromRequest as jest.MockedFunction<typeof getAuthFromRequest>
const mockFindFirst = prisma.agent.findFirst as jest.MockedFunction<typeof prisma.agent.findFirst>
const mockDelete = prisma.agent.delete as jest.MockedFunction<typeof prisma.agent.delete>

const OWNER = { id: 'owner-1', email: 'o@e.com', name: 'Owner', role: 'user' }
const OTHER = { id: 'other-1', email: 'x@e.com', name: 'Other', role: 'user' }
const ADMIN = { id: 'admin-1', email: 'a@e.com', name: 'Admin', role: 'admin' }

function req(method = 'GET') {
  return new NextRequest('http://localhost/api/agents/agent-1', { method })
}
const ctx = { params: Promise.resolve({ id: 'agent-1' }) }

beforeEach(() => jest.clearAllMocks())

describe('GET /api/agents/[id] — ownership', () => {
  it('scopes the query to the requesting user (createdBy filter present)', async () => {
    mockGetAuth.mockResolvedValueOnce(OTHER as any)
    mockFindFirst.mockResolvedValueOnce(null as any) // não é dono → Prisma não acha

    const res = await GET(req(), ctx)
    expect(res.status).toBe(404)
    // a query DEVE filtrar por dono
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'agent-1', createdBy: 'other-1' }) })
    )
  })

  it('returns the agent to its owner', async () => {
    mockGetAuth.mockResolvedValueOnce(OWNER as any)
    mockFindFirst.mockResolvedValueOnce({ id: 'agent-1', createdBy: 'owner-1', name: 'A' } as any)

    const res = await GET(req(), ctx)
    expect(res.status).toBe(200)
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ createdBy: 'owner-1' }) })
    )
  })

  it('does not apply an owner filter for admins (createdBy undefined → sees all)', async () => {
    mockGetAuth.mockResolvedValueOnce(ADMIN as any)
    mockFindFirst.mockResolvedValueOnce({ id: 'agent-1', createdBy: 'someone-else', name: 'A' } as any)

    const res = await GET(req(), ctx)
    expect(res.status).toBe(200)
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'agent-1', createdBy: undefined }) })
    )
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetAuth.mockResolvedValueOnce(null)
    const res = await GET(req(), ctx)
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/agents/[id] — ownership', () => {
  it('returns 404 and does not delete when the user is not the owner', async () => {
    mockGetAuth.mockResolvedValueOnce(OTHER as any)
    mockFindFirst.mockResolvedValueOnce(null as any)

    const res = await DELETE(req('DELETE'), ctx)
    expect(res.status).toBe(404)
    expect(mockDelete).not.toHaveBeenCalled()
  })
})
