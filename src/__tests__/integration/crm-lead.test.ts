/**
 * Integration tests for POST /api/crm/lead
 *
 * This is a public endpoint (no auth required) that validates fields and
 * proxies to the Sirius CRM. We mock the global fetch to avoid real HTTP calls.
 */

import { POST } from '@/app/api/crm/lead/route'
import { NextRequest } from 'next/server'

function makeRequest(body?: object) {
  return new NextRequest('http://localhost/api/crm/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : { body: JSON.stringify({}) }),
  })
}

// Save the original global fetch and restore after each test
const originalFetch = global.fetch

beforeEach(() => {
  // Set the required env var so tests reach the CRM call
  process.env.SIRIUS_CRM_API_KEY = 'test-api-key'
  process.env.SIRIUS_CRM_URL = 'https://crm.example.com'
})

afterEach(() => {
  global.fetch = originalFetch
  delete process.env.SIRIUS_CRM_API_KEY
})

// ---------------------------------------------------------------------------
// Validation tests
// ---------------------------------------------------------------------------
describe('POST /api/crm/lead — validation', () => {
  it('should return 400 when name is missing', async () => {
    const res = await POST(makeRequest({ email: 'test@example.com' }))
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.error).toContain('Nome')
  })

  it('should return 400 when name is too short (less than 2 chars)', async () => {
    const res = await POST(makeRequest({ name: 'A', email: 'test@example.com' }))
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.error).toContain('Nome')
  })

  it('should return 400 when email is missing', async () => {
    const res = await POST(makeRequest({ name: 'Joao Silva' }))
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.error).toContain('Email')
  })

  it('should return 400 when email format is invalid', async () => {
    const res = await POST(makeRequest({ name: 'Joao Silva', email: 'not-an-email' }))
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.error).toContain('Email')
  })
})

// ---------------------------------------------------------------------------
// Happy path and CRM integration
// ---------------------------------------------------------------------------
describe('POST /api/crm/lead — CRM integration', () => {
  it('should return 500 when SIRIUS_CRM_API_KEY is not configured', async () => {
    delete process.env.SIRIUS_CRM_API_KEY

    const res = await POST(makeRequest({ name: 'Joao Silva', email: 'joao@example.com' }))
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.error).toContain('Configuração')
  })

  it('should return 200 when CRM accepts the lead', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'crm-contact-123' }),
    } as Response)

    const res = await POST(makeRequest({ name: 'Joao Silva', email: 'joao@example.com' }))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)

    // Verify the CRM call was made with proper headers
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/contacts'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-api-key',
        }),
      })
    )
  })

  it('should return 502 when CRM returns a non-OK status', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    } as Response)

    const res = await POST(makeRequest({ name: 'Joao Silva', email: 'joao@example.com' }))
    expect(res.status).toBe(502)

    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('should forward optional fields (phone, company) to the CRM', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)

    await POST(makeRequest({
      name: 'Maria Souza',
      email: 'maria@example.com',
      phone: '11999999999',
      company: 'ROI Labs',
    }))

    const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(callBody.phone).toBe('11999999999')
    expect(callBody.company).toBe('ROI Labs')
  })
})
