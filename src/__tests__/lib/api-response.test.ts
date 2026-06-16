/**
 * Unit tests for the api-response envelope helpers (Sprint 1).
 */

import { apiOk, apiError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api-response'

describe('apiOk', () => {
  it('wraps data with success:true and status 200 by default', async () => {
    const res = apiOk({ a: 1 })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, data: { a: 1 } })
  })

  it('honors a custom status', () => {
    expect(apiOk({ id: 'x' }, { status: 201 }).status).toBe(201)
  })

  it('includes meta and message when provided', async () => {
    const res = apiOk([1, 2], { meta: { count: 2 }, message: 'done' })
    expect(await res.json()).toEqual({ success: true, data: [1, 2], meta: { count: 2 }, message: 'done' })
  })
})

describe('apiError', () => {
  it('wraps an error with success:false and the given status', async () => {
    const res = apiError('boom', 404)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ success: false, error: 'boom' })
  })

  it('defaults to status 400 and merges extra fields', async () => {
    const res = apiError('bad', undefined, { code: 'X' })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ success: false, error: 'bad', code: 'X' })
  })
})

describe('status shortcuts', () => {
  it('apiUnauthorized -> 401 Unauthorized', async () => {
    const res = apiUnauthorized()
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ success: false, error: 'Unauthorized' })
  })

  it('apiForbidden -> 403', () => {
    expect(apiForbidden().status).toBe(403)
  })

  it('apiNotFound -> 404', () => {
    expect(apiNotFound().status).toBe(404)
  })
})
