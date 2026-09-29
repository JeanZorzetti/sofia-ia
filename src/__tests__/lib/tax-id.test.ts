/**
 * Unit tests for CPF/CNPJ validation (spec 013 FR-005).
 */

import { parseTaxId } from '@/lib/tax-id'

describe('parseTaxId', () => {
  it('accepts a valid CPF with or without mask and formats it', () => {
    expect(parseTaxId('529.982.247-25')).toEqual({ type: 'br_cpf', value: '529.982.247-25' })
    expect(parseTaxId('52998224725')).toEqual({ type: 'br_cpf', value: '529.982.247-25' })
  })

  it('accepts a valid numeric CNPJ and formats it', () => {
    expect(parseTaxId('57493675000137')).toEqual({ type: 'br_cnpj', value: '57.493.675/0001-37' })
    expect(parseTaxId('11.222.333/0001-81')).toEqual({ type: 'br_cnpj', value: '11.222.333/0001-81' })
  })

  it('accepts a valid alphanumeric CNPJ (IN RFB 2.229/2024)', () => {
    expect(parseTaxId('12.ABC.345/01DE-35')).toEqual({ type: 'br_cnpj', value: '12.ABC.345/01DE-35' })
  })

  it('rejects wrong check digits', () => {
    expect(parseTaxId('529.982.247-24')).toBeNull()
    expect(parseTaxId('57.493.675/0001-38')).toBeNull()
    expect(parseTaxId('12.ABC.345/01DE-36')).toBeNull()
  })

  it('rejects repeated digits, wrong length and empty input', () => {
    expect(parseTaxId('111.111.111-11')).toBeNull()
    expect(parseTaxId('00000000000000')).toBeNull()
    expect(parseTaxId('1234567890')).toBeNull()
    expect(parseTaxId('')).toBeNull()
  })
})
