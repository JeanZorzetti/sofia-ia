/** @jest-environment node */
// 005-agentic-companies T008 — staffing 1:1 (FR-003a). Agente já alocado → 409;
// agente de outro dono → 404. jest roda no CI.
import { POST } from '@/app/api/companies/[id]/roles/[roleKey]/staff/route'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/auth', () => ({ getAuthFromRequest: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    company: { findFirst: jest.fn() },
    companyRole: { findUnique: jest.fn(), update: jest.fn() },
    agent: { findFirst: jest.fn() },
  },
}))

const mockAuth = getAuthFromRequest as jest.Mock
const mockCompanyFindFirst = prisma.company.findFirst as jest.Mock
const mockRoleFindUnique = prisma.companyRole.findUnique as jest.Mock
const mockRoleUpdate = prisma.companyRole.update as jest.Mock
const mockAgentFindFirst = prisma.agent.findFirst as jest.Mock

function ctx() { return { params: Promise.resolve({ id: 'company-1', roleKey: 'backend' }) } }
function req() {
  return new Request('http://localhost/api/companies/company-1/roles/backend/staff', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: 'agent-1' }),
  }) as never
}

describe('POST staff — 1:1 + ownership', () => {
  beforeEach(() => jest.clearAllMocks())

  it('401 quando não autenticado', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(req(), ctx())
    expect(res.status).toBe(401)
  })

  it('409 quando o agente já ocupa outro cargo', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', role: 'agent', email: '', name: '' })
    mockCompanyFindFirst.mockResolvedValue({ id: 'company-1' })
    mockRoleFindUnique
      .mockResolvedValueOnce({ id: 'role-1' })       // o cargo destino
      .mockResolvedValueOnce({ id: 'role-other' })   // ocupância: agente já em OUTRO cargo
    mockAgentFindFirst.mockResolvedValue({ id: 'agent-1' })
    const res = await POST(req(), ctx())
    expect(res.status).toBe(409)
    expect(mockRoleUpdate).not.toHaveBeenCalled()
  })

  it('404 quando o agente é de outro dono', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', role: 'agent', email: '', name: '' })
    mockCompanyFindFirst.mockResolvedValue({ id: 'company-1' })
    mockRoleFindUnique.mockResolvedValueOnce({ id: 'role-1' })
    mockAgentFindFirst.mockResolvedValue(null) // não pertence ao dono
    const res = await POST(req(), ctx())
    expect(res.status).toBe(404)
    expect(mockRoleUpdate).not.toHaveBeenCalled()
  })

  it('200 ao encaixar agente livre do próprio dono', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', role: 'agent', email: '', name: '' })
    mockCompanyFindFirst.mockResolvedValue({ id: 'company-1' })
    mockRoleFindUnique
      .mockResolvedValueOnce({ id: 'role-1' })  // cargo
      .mockResolvedValueOnce(null)              // agente livre
    mockAgentFindFirst.mockResolvedValue({ id: 'agent-1' })
    mockRoleUpdate.mockResolvedValue({ id: 'role-1', agentId: 'agent-1', agent: { id: 'agent-1', name: 'A' } })
    const res = await POST(req(), ctx())
    expect(res.status).toBe(200)
    expect(mockRoleUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'role-1' }, data: { agentId: 'agent-1' } }))
  })
})
