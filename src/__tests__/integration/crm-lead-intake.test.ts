/**
 * Integration tests for the site-intake extension of POST /api/crm/lead
 * (spec 012 — Home V4). Covers honeypot, brief-context notes assembly and
 * retrocompatibility with the existing ContactForm payload.
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

const originalFetch = global.fetch

beforeEach(() => {
  process.env.SIRIUS_CRM_API_KEY = 'test-api-key'
  process.env.SIRIUS_CRM_URL = 'https://crm.example.com'
})

afterEach(() => {
  global.fetch = originalFetch
  delete process.env.SIRIUS_CRM_API_KEY
})

describe('POST /api/crm/lead — honeypot', () => {
  it('should return 200 without calling the CRM when the honeypot field is filled', async () => {
    global.fetch = jest.fn()

    const res = await POST(makeRequest({ name: 'Bot', email: 'bot@example.com', website: 'http://spam.example' }))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should proceed normally when the honeypot field is empty', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)

    const res = await POST(makeRequest({ name: 'Joao Silva', email: 'joao@example.com', website: '' }))
    expect(res.status).toBe(200)
    expect(global.fetch).toHaveBeenCalled()
  })
})

describe('POST /api/crm/lead — site-intake brief context', () => {
  it('should concatenate subject, siteType, currentSite and goal into notes', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)

    await POST(makeRequest({
      name: 'Maria Souza',
      email: 'maria@example.com',
      subject: 'site-intake',
      siteType: 'landing',
      currentSite: 'meusite.com.br',
      goal: 'gerar leads',
    }))

    const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(callBody.notes).toContain('site-intake')
    expect(callBody.notes).toContain('landing')
    expect(callBody.notes).toContain('meusite.com.br')
    expect(callBody.notes).toContain('gerar leads')
  })

  it('should still validate name and email for intake submissions', async () => {
    const res = await POST(makeRequest({ email: 'joao@example.com', subject: 'site-intake' }))
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.error).toContain('Nome')
  })
})

describe('POST /api/crm/lead — retrocompat with ContactForm', () => {
  it('should produce the same payload as before when only legacy fields are sent', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)

    await POST(makeRequest({
      name: 'Joao Silva',
      email: 'joao@example.com',
      phone: '11999999999',
      company: 'ROI Labs',
      subject: 'sales',
      message: 'Quero um plano',
    }))

    const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(callBody).toEqual({
      name: 'Joao Silva',
      email: 'joao@example.com',
      phone: '11999999999',
      company: 'ROI Labs',
      notes: 'Assunto: sales | Mensagem: Quero um plano',
    })
  })
})
