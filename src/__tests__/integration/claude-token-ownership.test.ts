/**
 * 011-byos — auth / write-only / scope / audit for /api/settings/claude-token (T014).
 * Constituição V: rota autenticada, escopada por auth.id, valor NUNCA exposto.
 */
jest.mock('@/lib/auth', () => ({ getAuthFromRequest: jest.fn() }))
jest.mock('@/lib/audit', () => ({
  logAudit: jest.fn(),
  getIpFromRequest: jest.fn(),
  getUserAgentFromRequest: jest.fn(),
}))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    userClaudeToken: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      update: jest.fn(),
    },
  },
}))
jest.mock('@/lib/crypto', () => ({
  encrypt: (s: string) => `CIPHER(${s})`,
  decrypt: (s: string) => s,
}))
jest.mock('@/services/claude-cli-service', () => ({
  ClaudeCliService: { generate: jest.fn() },
}))

import { GET, PUT, DELETE } from '@/app/api/settings/claude-token/route'
import { getAuthFromRequest } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { ClaudeCliService } from '@/services/claude-cli-service'
import { NextRequest } from 'next/server'

const mockAuth = getAuthFromRequest as jest.MockedFunction<typeof getAuthFromRequest>
const mockLogAudit = logAudit as jest.MockedFunction<typeof logAudit>
const findUnique = prisma.userClaudeToken.findUnique as jest.Mock
const upsert = prisma.userClaudeToken.upsert as jest.Mock
const deleteMany = prisma.userClaudeToken.deleteMany as jest.Mock
const generate = ClaudeCliService.generate as jest.Mock

const OWNER = { id: 'owner-1', email: 'o@e.com', name: 'Owner', role: 'user' }
const VALID = 'sk-ant-oat01-' + 'a'.repeat(40)

function req(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/settings/claude-token', {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
  })
}

beforeEach(() => jest.clearAllMocks())

describe('GET', () => {
  it('401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    expect((await GET(req('GET'))).status).toBe(401)
  })

  it('{configured:false} + owner-scoped query without encryptedToken in the select', async () => {
    mockAuth.mockResolvedValueOnce(OWNER as never)
    findUnique.mockResolvedValueOnce(null)
    const res = await GET(req('GET'))
    expect(await res.json()).toEqual({ configured: false })
    const arg = findUnique.mock.calls[0][0]
    expect(arg.where).toEqual({ userId: 'owner-1' })          // scoped to auth.id
    expect(arg.select.encryptedToken).toBeUndefined()          // write-only: never selected
  })

  it('never leaks the ciphertext/value in the response body', async () => {
    mockAuth.mockResolvedValueOnce(OWNER as never)
    findUnique.mockResolvedValueOnce({
      mask: 'sk-ant-oat...aaaa',
      createdAt: new Date('2026-07-08T12:00:00Z'),
      lastVerifiedAt: new Date('2026-07-08T12:00:00Z'),
      lastUsedAt: null,
    })
    const raw = await (await GET(req('GET'))).text()
    expect(raw).toContain('sk-ant-oat...aaaa')
    expect(raw).not.toContain('CIPHER(')
    expect(raw).not.toContain(VALID)
  })
})

describe('PUT', () => {
  it('401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    expect((await PUT(req('PUT', { token: VALID }))).status).toBe(401)
  })

  it('400 invalid_format — nothing verified or saved', async () => {
    mockAuth.mockResolvedValueOnce(OWNER as never)
    const res = await PUT(req('PUT', { token: 'not-a-valid-token' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_format')
    expect(generate).not.toHaveBeenCalled()
    expect(upsert).not.toHaveBeenCalled()
  })

  it('422 token_rejected — verified but empty output → not saved', async () => {
    mockAuth.mockResolvedValueOnce(OWNER as never)
    generate.mockResolvedValueOnce({ content: '' }) // invalid token → CLI empty output
    const res = await PUT(req('PUT', { token: VALID }))
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe('token_rejected')
    expect(upsert).not.toHaveBeenCalled()
  })

  it('200 saves (scoped to auth.id) + audits claude_token.created', async () => {
    mockAuth.mockResolvedValueOnce(OWNER as never)
    generate.mockResolvedValueOnce({ content: 'OK' })
    findUnique
      .mockResolvedValueOnce(null) // saveClaudeToken existing-check → not a rotation
      .mockResolvedValueOnce({ mask: 'sk-ant-oat...aaaa', createdAt: new Date(), lastVerifiedAt: new Date(), lastUsedAt: null })
    upsert.mockResolvedValueOnce({})
    const res = await PUT(req('PUT', { token: VALID }))
    expect(res.status).toBe(200)
    expect(upsert.mock.calls[0][0].where).toEqual({ userId: 'owner-1' }) // scope
    expect(mockLogAudit).toHaveBeenCalledWith(
      'owner-1', 'claude_token.created', 'claude_token', undefined,
      expect.objectContaining({ mask: expect.any(String) }),
      undefined, undefined, undefined,
    )
    // audit metadata carries only the mask, never the token value
    const auditMeta = mockLogAudit.mock.calls[0][4] as Record<string, unknown>
    expect(JSON.stringify(auditMeta)).not.toContain(VALID)
  })
})

describe('rotation (US3)', () => {
  it('rejected new token keeps the old one (422, no write)', async () => {
    mockAuth.mockResolvedValueOnce(OWNER as never)
    generate.mockResolvedValueOnce({ content: '' }) // new token fails verification
    const res = await PUT(req('PUT', { token: VALID }))
    expect(res.status).toBe(422)
    expect(upsert).not.toHaveBeenCalled() // old ciphertext never overwritten
  })

  it('valid new token over an existing one audits claude_token.rotated', async () => {
    mockAuth.mockResolvedValueOnce(OWNER as never)
    generate.mockResolvedValueOnce({ content: 'OK' })
    findUnique
      .mockResolvedValueOnce({ id: 'row-1' }) // existing token → rotation
      .mockResolvedValueOnce({ mask: 'sk-ant-oat...bbbb', createdAt: new Date(), lastVerifiedAt: new Date(), lastUsedAt: null })
    upsert.mockResolvedValueOnce({})
    const res = await PUT(req('PUT', { token: VALID }))
    expect(res.status).toBe(200)
    expect(mockLogAudit.mock.calls[0][1]).toBe('claude_token.rotated')
  })
})

describe('DELETE', () => {
  it('401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    expect((await DELETE(req('DELETE'))).status).toBe(401)
  })

  it('404 when there was no token', async () => {
    mockAuth.mockResolvedValueOnce(OWNER as never)
    deleteMany.mockResolvedValueOnce({ count: 0 })
    const res = await DELETE(req('DELETE'))
    expect(res.status).toBe(404)
    expect(mockLogAudit).not.toHaveBeenCalled()
  })

  it('200 {configured:false} + audits claude_token.deleted', async () => {
    mockAuth.mockResolvedValueOnce(OWNER as never)
    deleteMany.mockResolvedValueOnce({ count: 1 })
    const res = await DELETE(req('DELETE'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ configured: false })
    expect(deleteMany.mock.calls[0][0].where).toEqual({ userId: 'owner-1' })
    expect(mockLogAudit).toHaveBeenCalledWith(
      'owner-1', 'claude_token.deleted', 'claude_token', undefined, undefined, undefined, undefined, undefined,
    )
  })
})
