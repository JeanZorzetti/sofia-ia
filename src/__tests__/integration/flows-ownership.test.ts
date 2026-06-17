/**
 * IDOR regression tests for /api/flows/[id] (Sprint 0 — seguranca P0).
 *
 * Flows nao usa `ownerId(auth)`: faz `findUnique({ id })` e compara
 * `flow.createdBy !== user.id` no codigo (sem bypass de admin). O envelope de
 * resposta deste grupo e `{ data, error }` (nao `{ success }`), inclusive no 401
 * (via `onUnauthorized` custom). Os testes consagram esse contrato.
 */
jest.mock('@/lib/auth', () => ({ getAuthFromRequest: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    flow: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    flowVersion: { create: jest.fn() },
  },
}))

import { GET, PUT, DELETE } from '@/app/api/flows/[id]/route'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

const mockGetAuth = getAuthFromRequest as jest.MockedFunction<typeof getAuthFromRequest>
const mockFindUnique = prisma.flow.findUnique as jest.Mock
const mockUpdate = prisma.flow.update as jest.Mock
const mockDelete = prisma.flow.delete as jest.Mock

const OWNER = { id: 'owner-1', email: 'o@e.com', name: 'Owner', role: 'user' }
const OTHER = { id: 'other-1', email: 'x@e.com', name: 'Other', role: 'user' }

function req(method = 'GET', body?: object) {
  return new NextRequest('http://localhost/api/flows/flow-1', {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}
const ctx = { params: Promise.resolve({ id: 'flow-1' }) }

beforeEach(() => jest.clearAllMocks())

describe('GET /api/flows/[id] — ownership', () => {
  it("returns 404 (envelope {data:null,error}) when the flow belongs to someone else", async () => {
    mockGetAuth.mockResolvedValueOnce(OTHER as any)
    mockFindUnique.mockResolvedValueOnce({ id: 'flow-1', createdBy: 'owner-1' })

    const res = await GET(req(), ctx)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.data).toBeNull()
    expect(body.error).toBeTruthy()
  })

  it('returns the flow to its owner', async () => {
    mockGetAuth.mockResolvedValueOnce(OWNER as any)
    mockFindUnique.mockResolvedValueOnce({ id: 'flow-1', createdBy: 'owner-1', name: 'F' })

    const res = await GET(req(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.id).toBe('flow-1')
    expect(body.error).toBeNull()
  })

  it('returns 404 when the flow does not exist', async () => {
    mockGetAuth.mockResolvedValueOnce(OWNER as any)
    mockFindUnique.mockResolvedValueOnce(null)

    const res = await GET(req(), ctx)
    expect(res.status).toBe(404)
  })

  it('returns 401 with the flows envelope when unauthenticated', async () => {
    mockGetAuth.mockResolvedValueOnce(null)
    const res = await GET(req(), ctx)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.data).toBeNull()
    expect(body.error).toBeTruthy()
  })
})

describe('PUT /api/flows/[id] — ownership', () => {
  it('returns 404 and does not update for a non-owner', async () => {
    mockGetAuth.mockResolvedValueOnce(OTHER as any)
    mockFindUnique.mockResolvedValueOnce({ id: 'flow-1', createdBy: 'owner-1' })

    const res = await PUT(req('PUT', { name: 'x' }), ctx)
    expect(res.status).toBe(404)
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/flows/[id] — ownership', () => {
  it('returns 404 and does not delete for a non-owner', async () => {
    mockGetAuth.mockResolvedValueOnce(OTHER as any)
    mockFindUnique.mockResolvedValueOnce({ id: 'flow-1', createdBy: 'owner-1' })

    const res = await DELETE(req('DELETE'), ctx)
    expect(res.status).toBe(404)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('deletes the flow for its owner', async () => {
    mockGetAuth.mockResolvedValueOnce(OWNER as any)
    mockFindUnique.mockResolvedValueOnce({ id: 'flow-1', createdBy: 'owner-1' })
    mockDelete.mockResolvedValueOnce({ id: 'flow-1' })

    const res = await DELETE(req('DELETE'), ctx)
    expect(res.status).toBe(200)
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'flow-1' } })
  })
})
