/**
 * Unit tests for src/lib/authz.ts (Sprint 0 — segurança P0).
 *
 * Cobre o modelo de propriedade (ownerId/isAdmin) e a autenticação de cron
 * timing-safe + fail-closed (verifyCronAuth).
 */
import { ownerId, isAdmin, verifyCronAuth } from '@/lib/authz'
import { NextRequest } from 'next/server'
import type { JWTPayload } from '@/lib/auth'

const USER: JWTPayload = { id: 'user-1', email: 'u@example.com', name: 'User', role: 'user' }
const ADMIN: JWTPayload = { id: 'admin-1', email: 'a@example.com', name: 'Admin', role: 'admin' }

describe('ownerId', () => {
  it('returns the user id for a non-admin (scopes queries to the owner)', () => {
    expect(ownerId(USER)).toBe('user-1')
  })

  it('returns undefined for an admin (Prisma ignores the field → sees all)', () => {
    expect(ownerId(ADMIN)).toBeUndefined()
  })
})

describe('isAdmin', () => {
  it('is true only for role === admin', () => {
    expect(isAdmin(ADMIN)).toBe(true)
    expect(isAdmin(USER)).toBe(false)
    expect(isAdmin(null)).toBe(false)
    expect(isAdmin(undefined)).toBe(false)
  })
})

describe('verifyCronAuth', () => {
  const ORIGINAL = process.env.CRON_SECRET
  afterAll(() => { process.env.CRON_SECRET = ORIGINAL })

  function req(headers: Record<string, string> = {}, url = 'http://localhost/api/cron/x') {
    return new NextRequest(url, { headers })
  }

  it('fails closed when CRON_SECRET is not set, even with a token', () => {
    delete process.env.CRON_SECRET
    expect(verifyCronAuth(req({ authorization: 'Bearer anything' }))).toBe(false)
  })

  it('accepts a valid Authorization: Bearer token', () => {
    process.env.CRON_SECRET = 'top-secret-value'
    expect(verifyCronAuth(req({ authorization: 'Bearer top-secret-value' }))).toBe(true)
  })

  it('accepts the x-cron-secret header', () => {
    process.env.CRON_SECRET = 'top-secret-value'
    expect(verifyCronAuth(req({ 'x-cron-secret': 'top-secret-value' }))).toBe(true)
  })

  it('accepts the ?secret= query param', () => {
    process.env.CRON_SECRET = 'top-secret-value'
    expect(verifyCronAuth(req({}, 'http://localhost/api/cron/x?secret=top-secret-value'))).toBe(true)
  })

  it('rejects a wrong token', () => {
    process.env.CRON_SECRET = 'top-secret-value'
    expect(verifyCronAuth(req({ authorization: 'Bearer wrong' }))).toBe(false)
  })

  it('rejects when no credential is provided', () => {
    process.env.CRON_SECRET = 'top-secret-value'
    expect(verifyCronAuth(req({}))).toBe(false)
  })
})
