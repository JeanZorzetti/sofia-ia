/**
 * IDOR regression tests for /api/skills/[id] (Sprint 0 — seguranca P0).
 *
 * GET enxerga skills builtin (`isBuiltin: true`) OU as do dono
 * (`createdBy: auth.id`). PUT/DELETE so atingem as do dono e nao-builtin
 * (`createdBy: auth.id, isBuiltin: false`) — builtins sao protegidas. Sem bypass
 * de admin. Envelope `{ success, error }`.
 */
jest.mock('@/lib/auth', () => ({ getAuthFromRequest: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: { skill: { findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() } },
}))

import { GET, PUT, DELETE } from '@/app/api/skills/[id]/route'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

const mockGetAuth = getAuthFromRequest as jest.MockedFunction<typeof getAuthFromRequest>
const mockFindFirst = prisma.skill.findFirst as jest.Mock
const mockUpdate = prisma.skill.update as jest.Mock
const mockDelete = prisma.skill.delete as jest.Mock

const OWNER = { id: 'owner-1', email: 'o@e.com', name: 'Owner', role: 'user' }
const OTHER = { id: 'other-1', email: 'x@e.com', name: 'Other', role: 'user' }

function req(method = 'GET', body?: object) {
  return new NextRequest('http://localhost/api/skills/skill-1', {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}
const ctx = { params: Promise.resolve({ id: 'skill-1' }) }

beforeEach(() => jest.clearAllMocks())

describe('GET /api/skills/[id] — visibility', () => {
  it("returns 404 for someone else's private skill (scoped by OR builtin/owner)", async () => {
    mockGetAuth.mockResolvedValueOnce(OTHER as any)
    mockFindFirst.mockResolvedValueOnce(null)

    const res = await GET(req(), ctx)
    expect(res.status).toBe(404)
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'skill-1',
          OR: [{ isBuiltin: true }, { createdBy: 'other-1' }],
        }),
      })
    )
  })

  it('returns a builtin skill to any authenticated user', async () => {
    mockGetAuth.mockResolvedValueOnce(OTHER as any)
    mockFindFirst.mockResolvedValueOnce({ id: 'skill-1', isBuiltin: true, name: 'B' })

    const res = await GET(req(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetAuth.mockResolvedValueOnce(null)
    const res = await GET(req(), ctx)
    expect(res.status).toBe(401)
  })
})

describe('PUT /api/skills/[id] — only owner, non-builtin', () => {
  it('returns 404 and does not update for a non-owner', async () => {
    mockGetAuth.mockResolvedValueOnce(OTHER as any)
    mockFindFirst.mockResolvedValueOnce(null)

    const res = await PUT(req('PUT', { name: 'x' }), ctx)
    expect(res.status).toBe(404)
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'skill-1', createdBy: 'other-1', isBuiltin: false } })
    )
  })
})

describe('DELETE /api/skills/[id] — builtin protection', () => {
  it('returns 404 and does not delete a builtin (filtered out by isBuiltin:false)', async () => {
    mockGetAuth.mockResolvedValueOnce(OWNER as any)
    mockFindFirst.mockResolvedValueOnce(null) // builtin nao passa pelo filtro isBuiltin:false

    const res = await DELETE(req('DELETE'), ctx)
    expect(res.status).toBe(404)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('deletes a user-created skill owned by the requester', async () => {
    mockGetAuth.mockResolvedValueOnce(OWNER as any)
    mockFindFirst.mockResolvedValueOnce({ id: 'skill-1', createdBy: 'owner-1', isBuiltin: false })
    mockDelete.mockResolvedValueOnce({ id: 'skill-1' })

    const res = await DELETE(req('DELETE'), ctx)
    expect(res.status).toBe(200)
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'skill-1' } })
  })
})
