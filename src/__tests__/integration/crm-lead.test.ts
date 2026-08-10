/**
 * @jest-environment node
 *
 * Integration tests for POST /api/crm/lead
 *
 * Public endpoint (no auth) that validates fields and forwards the lead to
 * the CRM do roihub via roihub-crm.ts. sendLeadToRoihub is mocked because it
 * schedules work with next/server's after(), which throws when called
 * outside a real request scope — the scope Next.js sets up around a Route
 * Handler in production, but not when the handler is invoked directly here.
 *
 * testEnvironment: node (em vez do jsdom default do projeto) porque
 * `next/server` (NextRequest/NextResponse) precisa de Fetch API real
 * (Request/Response/ReadableStream), que o jsdom não implementa.
 */

import { POST } from '@/app/api/crm/lead/route'
import { NextRequest } from 'next/server'
import { sendLeadToRoihub } from '@/lib/roihub-crm'

jest.mock('@/lib/roihub-crm', () => ({
  sendLeadToRoihub: jest.fn(),
}))

function makeRequest(body?: object) {
  return new NextRequest('http://localhost/api/crm/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : { body: JSON.stringify({}) }),
  })
}

afterEach(() => {
  jest.clearAllMocks()
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
// roihub integration
// ---------------------------------------------------------------------------
describe('POST /api/crm/lead — roihub integration', () => {
  it('should return success and forward the lead as polaris:peca-seu-site by default', async () => {
    const res = await POST(makeRequest({ name: 'Joao Silva', email: 'joao@example.com' }))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)

    expect(sendLeadToRoihub).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Joao Silva',
        email: 'joao@example.com',
        origem: 'polaris:peca-seu-site',
      })
    )
  })

  it('should forward subject early_access as origem polaris:early-access', async () => {
    await POST(makeRequest({ name: 'Joao Silva', email: 'joao@example.com', subject: 'early_access' }))

    expect(sendLeadToRoihub).toHaveBeenCalledWith(
      expect.objectContaining({ origem: 'polaris:early-access' })
    )
  })

  it('should forward optional fields (phone, company) to roihub', async () => {
    await POST(makeRequest({
      name: 'Maria Souza',
      email: 'maria@example.com',
      phone: '11999999999',
      company: 'ROI Labs',
    }))

    expect(sendLeadToRoihub).toHaveBeenCalledWith(
      expect.objectContaining({
        telefone: '11999999999',
        metadata: expect.objectContaining({ company: 'ROI Labs' }),
      })
    )
  })
})
