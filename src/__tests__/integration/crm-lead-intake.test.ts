/**
 * @jest-environment node
 *
 * Integration tests for the site-intake and early-access paths of
 * POST /api/crm/lead (IntakeForm.tsx and the early-access page). Covers
 * honeypot and the origem/metadata mapping sent to the CRM do roihub.
 * sendLeadToRoihub is mocked — see crm-lead.test.ts for why (after() needs a
 * real request scope that direct handler calls in tests don't provide).
 *
 * testEnvironment: node — ver crm-lead.test.ts (Fetch API real, ausente no jsdom).
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

describe('POST /api/crm/lead — honeypot', () => {
  it('should return 200 without forwarding to roihub when the honeypot field is filled', async () => {
    const res = await POST(makeRequest({ name: 'Bot', email: 'bot@example.com', website: 'http://spam.example' }))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(sendLeadToRoihub).not.toHaveBeenCalled()
  })

  it('should proceed normally when the honeypot field is empty', async () => {
    const res = await POST(makeRequest({ name: 'Joao Silva', email: 'joao@example.com', website: '' }))
    expect(res.status).toBe(200)
    expect(sendLeadToRoihub).toHaveBeenCalled()
  })
})

describe('POST /api/crm/lead — site-intake metadata', () => {
  it('should forward company, siteType, currentSite and goal as metadata', async () => {
    await POST(makeRequest({
      name: 'Maria Souza',
      email: 'maria@example.com',
      company: 'ACME',
      subject: 'site-intake',
      siteType: 'landing',
      currentSite: 'meusite.com.br',
      goal: 'gerar leads',
    }))

    expect(sendLeadToRoihub).toHaveBeenCalledWith(
      expect.objectContaining({
        origem: 'polaris:peca-seu-site',
        metadata: { company: 'ACME', siteType: 'landing', currentSite: 'meusite.com.br', goal: 'gerar leads' },
      })
    )
  })

  it('should still validate name and email for intake submissions', async () => {
    const res = await POST(makeRequest({ email: 'joao@example.com', subject: 'site-intake' }))
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.error).toContain('Nome')
  })
})

describe('POST /api/crm/lead — early access metadata', () => {
  it('should forward company and message as metadata, origem polaris:early-access', async () => {
    await POST(makeRequest({
      name: 'Joao Silva',
      email: 'joao@example.com',
      company: 'ACME',
      subject: 'early_access',
      message: 'Tipo de uso: agencia',
      phone: '',
    }))

    expect(sendLeadToRoihub).toHaveBeenCalledWith(
      expect.objectContaining({
        origem: 'polaris:early-access',
        telefone: null,
        metadata: { company: 'ACME', message: 'Tipo de uso: agencia' },
      })
    )
  })
})
