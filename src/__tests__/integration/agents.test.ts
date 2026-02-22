/**
 * Integration tests for POST /api/agents and GET /api/agents
 *
 * Strategy: import the Next.js route handler functions directly and call them
 * with a mocked NextRequest. This avoids starting a real server while still
 * exercising the full request/response path including auth and DB calls.
 */

// Mock dependencies before importing the route
jest.mock('@/lib/auth', () => ({
  getAuthFromRequest: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    agent: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock('@/lib/plan-limits', () => ({
  checkPlanLimit: jest.fn(),
}))

import { GET, POST } from '@/app/api/agents/route'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkPlanLimit } from '@/lib/plan-limits'
import { NextRequest } from 'next/server'

const mockGetAuth = getAuthFromRequest as jest.MockedFunction<typeof getAuthFromRequest>
const mockFindMany = prisma.agent.findMany as jest.MockedFunction<typeof prisma.agent.findMany>
const mockCreate = prisma.agent.create as jest.MockedFunction<typeof prisma.agent.create>
const mockCheckPlanLimit = checkPlanLimit as jest.MockedFunction<typeof checkPlanLimit>

const MOCK_USER = { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'admin' }

function makeRequest(method: string, body?: object, url = 'http://localhost/api/agents') {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// GET /api/agents
// ---------------------------------------------------------------------------
describe('GET /api/agents', () => {
  it('should return 401 when not authenticated', async () => {
    mockGetAuth.mockResolvedValueOnce(null)

    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(401)

    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('Unauthorized')
  })

  it('should return 200 with agent list when authenticated', async () => {
    mockGetAuth.mockResolvedValueOnce(MOCK_USER)
    const agents = [{ id: 'a1', name: 'Agente 1' }, { id: 'a2', name: 'Agente 2' }]
    mockFindMany.mockResolvedValueOnce(agents as any)

    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)
    expect(body.data[0].id).toBe('a1')
  })

  it('should return 500 when prisma throws', async () => {
    mockGetAuth.mockResolvedValueOnce(MOCK_USER)
    mockFindMany.mockRejectedValueOnce(new Error('DB error'))

    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// POST /api/agents
// ---------------------------------------------------------------------------
describe('POST /api/agents', () => {
  it('should return 401 when not authenticated', async () => {
    mockGetAuth.mockResolvedValueOnce(null)

    const res = await POST(makeRequest('POST', { name: 'Agente', systemPrompt: 'Prompt' }))
    expect(res.status).toBe(401)

    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('Unauthorized')
  })

  it('should return 400 when name is missing', async () => {
    mockGetAuth.mockResolvedValueOnce(MOCK_USER)

    const res = await POST(makeRequest('POST', { systemPrompt: 'Prompt' }))
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('name')
  })

  it('should return 400 when systemPrompt is missing', async () => {
    mockGetAuth.mockResolvedValueOnce(MOCK_USER)
    mockCheckPlanLimit.mockResolvedValueOnce({ allowed: true, current: 0, limit: 20, plan: 'pro' })

    const res = await POST(makeRequest('POST', { name: 'Agente' }))
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('systemPrompt')
  })

  it('should return 403 when plan limit is reached', async () => {
    mockGetAuth.mockResolvedValueOnce(MOCK_USER)
    mockCheckPlanLimit.mockResolvedValueOnce({
      allowed: false,
      current: 2,
      limit: 2,
      plan: 'free',
      message: 'Limite de agentes atingido para seu plano.',
    })

    const res = await POST(makeRequest('POST', { name: 'Agente', systemPrompt: 'Prompt' }))
    expect(res.status).toBe(403)

    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('should return 201 and the created agent when input is valid', async () => {
    mockGetAuth.mockResolvedValueOnce(MOCK_USER)
    mockCheckPlanLimit.mockResolvedValueOnce({ allowed: true, current: 1, limit: 20, plan: 'pro' })
    const createdAgent = {
      id: 'new-agent',
      name: 'Agente Teste',
      systemPrompt: 'Voce e um assistente',
      model: 'llama-3.3-70b-versatile',
      channels: [],
      creator: MOCK_USER,
    }
    mockCreate.mockResolvedValueOnce(createdAgent as any)

    const res = await POST(makeRequest('POST', {
      name: 'Agente Teste',
      systemPrompt: 'Voce e um assistente',
    }))
    expect(res.status).toBe(201)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('new-agent')
  })
})
