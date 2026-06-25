/** @jest-environment node */
// 009-usecase-squads T007 — IDOR/auth em POST /api/companies/[id]/squads
// e POST /api/companies/[id]/squads/[squadId]/run. Jest roda no CI.
import { POST as createSquadRoute } from '@/app/api/companies/[id]/squads/route'
import { POST as runSquadRoute } from '@/app/api/companies/[id]/squads/[squadId]/run/route'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/auth', () => ({ getAuthFromRequest: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    company: { findFirst: jest.fn() },
    agent: { count: jest.fn() },
    team: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
    teamRun: { create: jest.fn() },
  },
}))
jest.mock('@/lib/orchestration/team/create-team', () => ({
  createTeamWithRoster: jest.fn().mockResolvedValue({ ok: true, team: { id: 'team-1', members: [] } }),
}))
jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  after: jest.fn((fn: () => void) => fn()),
}))
jest.mock('@/lib/companies/squad-queue', () => ({ dispatchSquadQueue: jest.fn().mockResolvedValue(undefined) }))

const mockAuth = getAuthFromRequest as jest.Mock

function makeCreateReq() {
  return new Request('http://localhost/api/companies/c1/squads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Feature',
      useCase: 'Implementar feature',
      members: [
        { agentId: '00000000-0000-0000-0000-000000000001', role: 'lead' },
        { agentId: '00000000-0000-0000-0000-000000000002', role: 'worker' },
      ],
    }),
  }) as never
}

function makeRunReq() {
  return new Request('http://localhost/api/companies/c1/squads/squad-1/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mission: 'Build something' }),
  }) as never
}

describe('POST /api/companies/[id]/squads', () => {
  beforeEach(() => jest.clearAllMocks())

  it('401 sem autenticação', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await createSquadRoute(makeCreateReq(), { params: Promise.resolve({ id: 'c1' }) })
    expect(res.status).toBe(401)
  })

  it('404 empresa de outro dono (IDOR)', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', role: 'agent', email: '', name: '' })
    ;(prisma.company.findFirst as jest.Mock).mockResolvedValue(null)
    const res = await createSquadRoute(makeCreateReq(), { params: Promise.resolve({ id: 'c1' }) })
    expect(res.status).toBe(404)
  })
})

describe('POST /api/companies/[id]/squads/[squadId]/run', () => {
  beforeEach(() => jest.clearAllMocks())

  it('401 sem autenticação', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await runSquadRoute(makeRunReq(), { params: Promise.resolve({ id: 'c1', squadId: 'squad-1' }) })
    expect(res.status).toBe(401)
  })

  it('404 empresa de outro dono (IDOR)', async () => {
    mockAuth.mockResolvedValue({ id: 'user-1', role: 'agent', email: '', name: '' })
    ;(prisma.company.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.team.findFirst as jest.Mock).mockResolvedValue(null)
    const res = await runSquadRoute(makeRunReq(), { params: Promise.resolve({ id: 'c1', squadId: 'squad-1' }) })
    expect(res.status).toBe(404)
  })
})
