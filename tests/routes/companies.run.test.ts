/** @jest-environment node */
// 005-agentic-companies T026 — POST /api/companies/[id]/run: auth/IDOR + 409 `blocked`
// quando cargo R/A de fase essencial está vago. jest roda no CI. (Não testamos o 202 de
// sucesso aqui: ele dispara after()/runCompany, fora do escopo de uma rota unitária.)
import { POST } from '@/app/api/companies/[id]/run/route'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getNicheBlueprint } from '@/lib/companies/company-blueprint'

jest.mock('@/lib/auth', () => ({ getAuthFromRequest: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: { company: { findFirst: jest.fn() }, companyRun: { create: jest.fn() } },
}))
jest.mock('@/lib/companies/company-run', () => ({ runCompany: jest.fn() }))

const mockAuth = getAuthFromRequest as jest.Mock
const mockCompanyFindFirst = prisma.company.findFirst as jest.Mock
const mockRunCreate = prisma.companyRun.create as jest.Mock

const blueprint = getNicheBlueprint('software_house')!
function ctx() { return { params: Promise.resolve({ id: 'company-1' }) } }
function req() {
  return new Request('http://localhost/api/companies/company-1/run', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mission: 'Build X' }),
  }) as never
}
/** Cargos do blueprint, todos VAGOS (agentId null). */
function vacantRoles() {
  return blueprint.roles.map(r => ({ key: r.key, agentId: null }))
}

describe('POST /api/companies/[id]/run', () => {
  beforeEach(() => jest.clearAllMocks())

  it('401 quando não autenticado', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(req(), ctx())
    expect(res.status).toBe(401)
  })

  it('404 quando a empresa é de outro dono', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', role: 'agent', email: '', name: '' })
    mockCompanyFindFirst.mockResolvedValue(null)
    const res = await POST(req(), ctx())
    expect(res.status).toBe(404)
  })

  it('409 blocked quando cargo R/A de fase essencial está vago', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', role: 'agent', email: '', name: '' })
    mockCompanyFindFirst.mockResolvedValue({ id: 'company-1', raci: blueprint.raci, roles: vacantRoles() })
    const res = await POST(req(), ctx())
    expect(res.status).toBe(409)
    expect(mockRunCreate).not.toHaveBeenCalled()
  })
})
