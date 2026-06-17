/**
 * Tests for /api/teams and /api/teams/[id] (Sprint 0 ownership + Sprint 5).
 *
 * Diferente de /api/agents (que usa `ownerId(auth)` → admin enxerga tudo), as
 * rotas de Team escopam por `createdBy: auth.id` DIRETO — ou seja, NAO ha bypass
 * de admin aqui: um admin so ve os proprios times. Os testes consagram esse
 * comportamento real (regressao de IDOR) sem alterar a logica.
 */
jest.mock('@/lib/auth', () => ({ getAuthFromRequest: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    team: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}))
jest.mock('@/lib/orchestration/team/create-team', () => ({ createTeamWithRoster: jest.fn() }))
jest.mock('@/lib/orchestration/team/team-roster', () => ({ validateRoster: jest.fn() }))

import { GET as LIST, POST } from '@/app/api/teams/route'
import { GET, PATCH, DELETE } from '@/app/api/teams/[id]/route'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createTeamWithRoster } from '@/lib/orchestration/team/create-team'
import { NextRequest } from 'next/server'

const mockGetAuth = getAuthFromRequest as jest.MockedFunction<typeof getAuthFromRequest>
const mockFindFirst = prisma.team.findFirst as jest.Mock
const mockFindMany = prisma.team.findMany as jest.Mock
const mockUpdate = prisma.team.update as jest.Mock
const mockCreateTeam = createTeamWithRoster as jest.Mock

const OWNER = { id: 'owner-1', email: 'o@e.com', name: 'Owner', role: 'user' }
const OTHER = { id: 'other-1', email: 'x@e.com', name: 'Other', role: 'user' }
const ADMIN = { id: 'admin-1', email: 'a@e.com', name: 'Admin', role: 'admin' }

function req(method = 'GET', body?: object) {
  return new NextRequest('http://localhost/api/teams/team-1', {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}
const ctx = { params: Promise.resolve({ id: 'team-1' }) }

beforeEach(() => jest.clearAllMocks())

describe('GET /api/teams/[id] — ownership', () => {
  it('returns 404 to a non-owner and scopes the query by createdBy', async () => {
    mockGetAuth.mockResolvedValueOnce(OTHER as any)
    mockFindFirst.mockResolvedValueOnce(null)

    const res = await GET(req(), ctx)
    expect(res.status).toBe(404)
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'team-1', createdBy: 'other-1' }) })
    )
  })

  it('returns the team to its owner', async () => {
    mockGetAuth.mockResolvedValueOnce(OWNER as any)
    mockFindFirst.mockResolvedValueOnce({ id: 'team-1', createdBy: 'owner-1', name: 'T' })

    const res = await GET(req(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('team-1')
  })

  it('does NOT grant admins a bypass (still scoped to admin.id)', async () => {
    mockGetAuth.mockResolvedValueOnce(ADMIN as any)
    mockFindFirst.mockResolvedValueOnce(null)

    const res = await GET(req(), ctx)
    expect(res.status).toBe(404)
    // Sem ownerId(): o where usa o id literal do admin, nao `undefined`.
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ createdBy: 'admin-1' }) })
    )
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetAuth.mockResolvedValueOnce(null)
    const res = await GET(req(), ctx)
    expect(res.status).toBe(401)
  })
})

describe('PATCH /api/teams/[id] — ownership', () => {
  it('returns 404 and does not update when the user is not the owner', async () => {
    mockGetAuth.mockResolvedValueOnce(OTHER as any)
    mockFindFirst.mockResolvedValueOnce(null) // ownTeam → null

    const res = await PATCH(req('PATCH', { name: 'novo' }), ctx)
    expect(res.status).toBe(404)
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/teams/[id] — ownership (archive)', () => {
  it('returns 404 and does not archive when the user is not the owner', async () => {
    mockGetAuth.mockResolvedValueOnce(OTHER as any)
    mockFindFirst.mockResolvedValueOnce(null)

    const res = await DELETE(req('DELETE'), ctx)
    expect(res.status).toBe(404)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('archives the team for its owner', async () => {
    mockGetAuth.mockResolvedValueOnce(OWNER as any)
    mockFindFirst.mockResolvedValueOnce({ id: 'team-1', createdBy: 'owner-1' })
    mockUpdate.mockResolvedValueOnce({ id: 'team-1', status: 'archived' })

    const res = await DELETE(req('DELETE'), ctx)
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'team-1' }, data: { status: 'archived' } })
    )
  })
})

describe('GET /api/teams — list scoping', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetAuth.mockResolvedValueOnce(null)
    const res = await LIST(new NextRequest('http://localhost/api/teams'))
    expect(res.status).toBe(401)
  })

  it('lists only the active teams owned by the requester', async () => {
    mockGetAuth.mockResolvedValueOnce(OWNER as any)
    mockFindMany.mockResolvedValueOnce([{ id: 'team-1', createdBy: 'owner-1' }])

    const res = await LIST(new NextRequest('http://localhost/api/teams'))
    expect(res.status).toBe(200)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ createdBy: 'owner-1', status: 'active' }) })
    )
  })
})

describe('POST /api/teams — create', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetAuth.mockResolvedValueOnce(null)
    const res = await POST(req('POST', { name: 'T' }))
    expect(res.status).toBe(401)
  })

  it('creates the team scoped to the authenticated user (userId = auth.id)', async () => {
    mockGetAuth.mockResolvedValueOnce(OWNER as any)
    mockCreateTeam.mockResolvedValueOnce({ ok: true, team: { id: 'new-team' } })

    const res = await POST(req('POST', { name: 'Time A', members: [] }))
    expect(res.status).toBe(200)
    expect(mockCreateTeam).toHaveBeenCalledWith(expect.objectContaining({ userId: 'owner-1' }))
  })

  it('returns 400 when roster creation is rejected', async () => {
    mockGetAuth.mockResolvedValueOnce(OWNER as any)
    mockCreateTeam.mockResolvedValueOnce({ ok: false, error: 'roster invalido' })

    const res = await POST(req('POST', { name: 'Time A' }))
    expect(res.status).toBe(400)
  })
})
