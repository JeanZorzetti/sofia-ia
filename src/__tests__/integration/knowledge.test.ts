/**
 * Integration tests for GET /api/knowledge
 *
 * Strategy: import route handler directly, mock auth and prisma.
 */

jest.mock('@/lib/auth', () => ({
  getAuthFromRequest: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    knowledgeBase: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}))

import { GET, POST } from '@/app/api/knowledge/route'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

const mockGetAuth = getAuthFromRequest as jest.MockedFunction<typeof getAuthFromRequest>
const mockFindMany = prisma.knowledgeBase.findMany as jest.MockedFunction<typeof prisma.knowledgeBase.findMany>
const mockKbCreate = prisma.knowledgeBase.create as jest.MockedFunction<typeof prisma.knowledgeBase.create>

const MOCK_USER = { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'admin' }

function makeRequest(method: string, body?: object, url = 'http://localhost/api/knowledge') {
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
// GET /api/knowledge
// ---------------------------------------------------------------------------
describe('GET /api/knowledge', () => {
  it('should return 401 when not authenticated', async () => {
    mockGetAuth.mockResolvedValueOnce(null)

    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(401)

    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('should return 200 with knowledge base list when authenticated', async () => {
    mockGetAuth.mockResolvedValueOnce(MOCK_USER)
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'kb-1',
        name: 'Base 1',
        documents: [
          { id: 'd1', title: 'Doc 1', status: 'completed', fileType: 'pdf', createdAt: new Date() },
        ],
      },
    ] as any)

    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.knowledgeBases).toHaveLength(1)
    expect(body.knowledgeBases[0].id).toBe('kb-1')
    expect(body.knowledgeBases[0].documentCount).toBe(1)
    expect(body.knowledgeBases[0].processedCount).toBe(1)
  })

  it('should return empty list when there are no knowledge bases', async () => {
    mockGetAuth.mockResolvedValueOnce(MOCK_USER)
    mockFindMany.mockResolvedValueOnce([])

    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.knowledgeBases).toHaveLength(0)
  })

  it('should return 500 when prisma throws', async () => {
    mockGetAuth.mockResolvedValueOnce(MOCK_USER)
    mockFindMany.mockRejectedValueOnce(new Error('DB failure'))

    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.error).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// POST /api/knowledge
// ---------------------------------------------------------------------------
describe('POST /api/knowledge', () => {
  it('should return 401 when not authenticated', async () => {
    mockGetAuth.mockResolvedValueOnce(null)

    const res = await POST(makeRequest('POST', { name: 'Minha Base' }))
    expect(res.status).toBe(401)
  })

  it('should return 400 when name is missing', async () => {
    mockGetAuth.mockResolvedValueOnce(MOCK_USER)

    const res = await POST(makeRequest('POST', {}))
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('should return 201 with the new knowledge base when input is valid', async () => {
    mockGetAuth.mockResolvedValueOnce(MOCK_USER)
    const created = { id: 'kb-new', name: 'Nova Base', documents: [] }
    mockKbCreate.mockResolvedValueOnce(created as any)

    const res = await POST(makeRequest('POST', { name: 'Nova Base' }))
    expect(res.status).toBe(201)

    const body = await res.json()
    expect(body.knowledgeBase.id).toBe('kb-new')
  })
})
