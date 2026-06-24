/** @jest-environment node */
// 005-agentic-companies T007 — IDOR/auth de GET+POST /api/companies.
// jest roda no CI (não local — OneDrive errno -4094). Mocka auth + prisma.
import { GET, POST } from '@/app/api/companies/route'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/auth', () => ({ getAuthFromRequest: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: { company: { findMany: jest.fn(), create: jest.fn() } },
}))

const mockAuth = getAuthFromRequest as jest.Mock
const mockFindMany = prisma.company.findMany as jest.Mock
const mockCreate = prisma.company.create as jest.Mock

function req(body?: unknown) {
  return new Request('http://localhost/api/companies', {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }) as never
}

describe('/api/companies — auth & ownership', () => {
  beforeEach(() => jest.clearAllMocks())

  it('401 quando não autenticado', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(req())
    expect(res.status).toBe(401)
  })

  it('GET escopa findMany ao dono (não-admin)', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', role: 'agent', email: '', name: '' })
    mockFindMany.mockResolvedValue([])
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { createdBy: 'user-1' } }))
  })

  it('admin vê todas (createdBy undefined → Prisma ignora)', async () => {
    mockAuth.mockResolvedValue({ id: 'admin-1', role: 'admin', email: '', name: '' })
    mockFindMany.mockResolvedValue([])
    await GET(req())
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { createdBy: undefined } }))
  })

  it('POST cria escopado ao auth.id, semeando o nicho', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', role: 'agent', email: '', name: '' })
    mockCreate.mockResolvedValue({ id: 'c1', roles: [] })
    const res = await POST(req({ name: 'Minha SH', niche: 'software_house' }))
    expect([200, 201]).toContain(res.status)
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ createdBy: 'user-1', niche: 'software_house' }),
    }))
  })

  it('POST rejeita nicho desconhecido com 400 (sem tocar o banco)', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', role: 'agent', email: '', name: '' })
    const res = await POST(req({ name: 'X', niche: 'nope' }))
    expect(res.status).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
