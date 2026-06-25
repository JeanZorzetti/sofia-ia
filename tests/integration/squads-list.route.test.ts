/** @jest-environment node */
// 009-usecase-squads T014 — GET /api/companies/[id]/squads: IDOR e listagem.
import { GET } from '@/app/api/companies/[id]/squads/route'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/auth', () => ({ getAuthFromRequest: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    company: { findFirst: jest.fn() },
    team: { findMany: jest.fn() },
  },
}))

const mockAuth = getAuthFromRequest as jest.Mock

function makeReq() {
  return new Request('http://localhost/api/companies/c1/squads', { method: 'GET' }) as never
}

describe('GET /api/companies/[id]/squads', () => {
  beforeEach(() => jest.clearAllMocks())

  it('401 sem autenticação', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(makeReq(), { params: Promise.resolve({ id: 'c1' }) })
    expect(res.status).toBe(401)
  })

  it('404 empresa de outro dono (IDOR)', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', role: 'agent', email: '', name: '' })
    ;(prisma.company.findFirst as jest.Mock).mockResolvedValue(null)
    const res = await GET(makeReq(), { params: Promise.resolve({ id: 'c1' }) })
    expect(res.status).toBe(404)
  })

  it('200 lista squads quando empresa pertence ao dono', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', role: 'agent', email: '', name: '' })
    ;(prisma.company.findFirst as jest.Mock).mockResolvedValue({ id: 'c1' })
    ;(prisma.team.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'squad-1', name: 'Feature', config: { useCase: 'Implementar feature' },
        members: [{ agentId: 'a1', role: 'lead', model: null, agent: { id: 'a1', name: 'Backend', model: 'claude-sonnet-4-6' } }],
        runs: [],
      },
    ])
    const res = await GET(makeReq(), { params: Promise.resolve({ id: 'c1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.squads).toHaveLength(1)
    expect(body.data.squads[0].id).toBe('squad-1')
  })
})
