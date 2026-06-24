/** @jest-environment node */
// 005-agentic-companies T033 — POST /api/companies/[id]/clone. Clona estrutura + RACI;
// cargos nascem VAGOS (sem agentId) → sem vazamento de agentes entre tenants. jest no CI.
import { POST } from '@/app/api/companies/[id]/clone/route'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/auth', () => ({ getAuthFromRequest: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: { company: { findFirst: jest.fn(), create: jest.fn() } },
}))

const mockAuth = getAuthFromRequest as jest.Mock
const mockFindFirst = prisma.company.findFirst as jest.Mock
const mockCreate = prisma.company.create as jest.Mock

function ctx() { return { params: Promise.resolve({ id: 'src-1' }) } }
function req() {
  return new Request('http://localhost/api/companies/src-1/clone', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Clone' }),
  }) as never
}

describe('POST /api/companies/[id]/clone', () => {
  beforeEach(() => jest.clearAllMocks())

  it('401 quando não autenticado', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(req(), ctx())
    expect(res.status).toBe(401)
  })

  it('404 quando a empresa origem é de outro dono', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', role: 'agent', email: '', name: '' })
    mockFindFirst.mockResolvedValue(null)
    const res = await POST(req(), ctx())
    expect(res.status).toBe(404)
  })

  it('clona estrutura+RACI com cargos vagos, escopado ao dono atual', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', role: 'agent', email: '', name: '' })
    mockFindFirst.mockResolvedValue({
      niche: 'software_house', typology: 'hybrid', raci: { planning: { ceo: 'A' } },
      roles: [{ key: 'ceo', title: 'CEO', layer: 'strategic', department: 'Executivo', position: 0 }],
    })
    mockCreate.mockResolvedValue({ id: 'clone-1', roles: [] })
    const res = await POST(req(), ctx())
    expect(res.status).toBe(201)

    const arg = mockCreate.mock.calls[0][0]
    expect(arg.data.createdBy).toBe('user-1')
    expect(arg.data.niche).toBe('software_house')
    expect(arg.data.raci).toEqual({ planning: { ceo: 'A' } })
    // Cargos clonados NÃO carregam agentId (nascem vagos → sem vazamento de tenant).
    const created = arg.data.roles.create
    expect(created[0]).not.toHaveProperty('agentId')
    expect(created[0].key).toBe('ceo')
  })
})
