/**
 * Unit tests for zod validation helpers and schemas (Sprint 1).
 */

import {
  parseJson,
  loginSchema,
  registerSchema,
  createAgentSchema,
  createTeamSchema,
} from '@/lib/validation'

// Minimal Request-like object whose .json() resolves to the given body.
function jsonReq(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}
// Request whose .json() throws (invalid/empty JSON).
function brokenReq(): Request {
  return { json: async () => { throw new Error('bad json') } } as unknown as Request
}

describe('parseJson', () => {
  it('returns ok:false with a friendly error on invalid JSON', async () => {
    const r = await parseJson(brokenReq(), loginSchema)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/JSON/i)
  })
})

describe('loginSchema', () => {
  it('accepts username + password', async () => {
    const r = await parseJson(jsonReq({ username: 'u', password: 'p' }), loginSchema)
    expect(r.ok).toBe(true)
  })

  it('rejects when password is missing', async () => {
    const r = await parseJson(jsonReq({ username: 'u' }), loginSchema)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('password')
  })
})

describe('registerSchema', () => {
  it('accepts a valid registration', async () => {
    const r = await parseJson(
      jsonReq({ name: 'Jean', email: 'a@b.com', password: '12345678' }),
      registerSchema,
    )
    expect(r.ok).toBe(true)
  })

  it('rejects an invalid email', async () => {
    const r = await parseJson(
      jsonReq({ name: 'Jean', email: 'not-an-email', password: '12345678' }),
      registerSchema,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('email')
  })

  it('rejects a password shorter than 8 chars', async () => {
    const r = await parseJson(
      jsonReq({ name: 'Jean', email: 'a@b.com', password: '123' }),
      registerSchema,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('password')
  })
})

describe('createAgentSchema', () => {
  it('requires name and systemPrompt', async () => {
    const r = await parseJson(jsonReq({ systemPrompt: 'p' }), createAgentSchema)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('name')
  })

  it('accepts a valid agent and strips unknown keys', async () => {
    const r = await parseJson(
      jsonReq({ name: 'A', systemPrompt: 'P', bogus: 'x' }),
      createAgentSchema,
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect((r.data as Record<string, unknown>).bogus).toBeUndefined()
  })
})

describe('createTeamSchema', () => {
  it('is permissive (all optional) so domain validation stays in the service', async () => {
    const r = await parseJson(jsonReq({}), createTeamSchema)
    expect(r.ok).toBe(true)
  })

  it('type-checks roster members when provided', async () => {
    const r = await parseJson(
      jsonReq({ members: [{ agentId: 'a1', role: 'lead' }] }),
      createTeamSchema,
    )
    expect(r.ok).toBe(true)
  })
})
