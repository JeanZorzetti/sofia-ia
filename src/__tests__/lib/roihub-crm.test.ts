/**
 * @jest-environment node
 *
 * external_id é a chave de dedupe de reenvio (FR-003, US3): mesmo envio
 * (email+origem) na mesma janela de 2min deve gerar o mesmo id; janelas
 * diferentes (retry >2min, ou reenvio intencional dias depois) devem gerar
 * ids diferentes — ver research.md §2.
 *
 * testEnvironment: node — roihub-crm.ts importa `after` de next/server, que
 * exige Fetch API real (ausente no jsdom default do projeto).
 */

import { externalId } from '@/lib/roihub-crm'

describe('externalId', () => {
  it('produces the same id for the same email+origem within the same 2min window', () => {
    const base = Date.parse('2026-08-10T10:00:00.000Z')
    jest.spyOn(Date, 'now').mockReturnValue(base)
    const first = externalId('joao@example.com', 'polaris:contato')

    jest.spyOn(Date, 'now').mockReturnValue(base + 90_000) // +90s, ainda na mesma janela de 2min
    const secondRetry = externalId('joao@example.com', 'polaris:contato')

    expect(secondRetry).toBe(first)

    jest.restoreAllMocks()
  })

  it('produces a different id once the 2min window rolls over', () => {
    const base = Date.parse('2026-08-10T10:00:00.000Z')
    jest.spyOn(Date, 'now').mockReturnValue(base)
    const first = externalId('joao@example.com', 'polaris:contato')

    jest.spyOn(Date, 'now').mockReturnValue(base + 121_000) // +121s, janela seguinte
    const later = externalId('joao@example.com', 'polaris:contato')

    expect(later).not.toBe(first)

    jest.restoreAllMocks()
  })

  it('produces different ids for different email or origem in the same window', () => {
    const base = Date.parse('2026-08-10T10:00:00.000Z')
    jest.spyOn(Date, 'now').mockReturnValue(base)

    const a = externalId('joao@example.com', 'polaris:contato')
    const b = externalId('maria@example.com', 'polaris:contato')
    const c = externalId('joao@example.com', 'polaris:peca-seu-site')

    expect(a).not.toBe(b)
    expect(a).not.toBe(c)

    jest.restoreAllMocks()
  })
})
