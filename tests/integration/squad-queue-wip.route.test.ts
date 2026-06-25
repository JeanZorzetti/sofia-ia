/** @jest-environment node */
// 009-usecase-squads T022 — WIP=1: 2º POST /run retorna queued:true e position>0.
import { POST as runSquadRoute } from '@/app/api/companies/[id]/squads/[squadId]/run/route'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as squadQueue from '@/lib/companies/squad-queue'

jest.mock('@/lib/auth', () => ({ getAuthFromRequest: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    company: { findFirst: jest.fn() },
    team: { findFirst: jest.fn() },
    teamRun: { create: jest.fn(), findUnique: jest.fn(), count: jest.fn() },
  },
}))
jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  after: jest.fn((fn: () => void) => fn()),
}))
jest.mock('@/lib/companies/squad-queue', () => ({
  enqueueSquadRun: jest.fn(),
  getQueuePosition: jest.fn(),
  dispatchSquadQueue: jest.fn().mockResolvedValue(undefined),
}))

const mockAuth = getAuthFromRequest as jest.Mock
const mockEnqueue = squadQueue.enqueueSquadRun as jest.Mock
const mockPosition = squadQueue.getQueuePosition as jest.Mock

function makeReq(squadId = 'squad-1') {
  return new Request(`http://localhost/api/companies/c1/squads/${squadId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mission: 'Do something' }),
  }) as never
}

const authUser = { id: 'user-1', role: 'agent', email: '', name: '' }

describe('POST /api/companies/[id]/squads/[squadId]/run — WIP=1 queue', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue(authUser)
    ;(prisma.company.findFirst as jest.Mock).mockResolvedValue({ id: 'c1' })
    ;(prisma.team.findFirst as jest.Mock).mockResolvedValue({ id: 'squad-1' })
    mockEnqueue.mockResolvedValue('run-xyz')
  })

  it('primeiro run: queued=false, position=0', async () => {
    mockPosition.mockResolvedValue(0)
    const res = await runSquadRoute(makeReq(), { params: Promise.resolve({ id: 'c1', squadId: 'squad-1' }) })
    expect(res.status).toBe(202)
    const body = await res.json()
    expect(body.data.queued).toBe(false)
    expect(body.data.position).toBe(0)
    expect(body.data.runId).toBe('run-xyz')
  })

  it('segundo run (fila ocupada): queued=true, position>0', async () => {
    mockPosition.mockResolvedValue(1)
    const res = await runSquadRoute(makeReq(), { params: Promise.resolve({ id: 'c1', squadId: 'squad-1' }) })
    expect(res.status).toBe(202)
    const body = await res.json()
    expect(body.data.queued).toBe(true)
    expect(body.data.position).toBe(1)
  })

  it('sempre dispara dispatchSquadQueue após enqueue', async () => {
    mockPosition.mockResolvedValue(0)
    await runSquadRoute(makeReq(), { params: Promise.resolve({ id: 'c1', squadId: 'squad-1' }) })
    expect(squadQueue.dispatchSquadQueue).toHaveBeenCalled()
  })
})
