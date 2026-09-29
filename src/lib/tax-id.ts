/**
 * CPF/CNPJ for the Stripe customer (spec 013 FR-005). Stripe Checkout does not collect Brazilian
 * tax IDs, so we validate here and store them on the customer as br_cpf / br_cnpj.
 * CNPJ accepts the alphanumeric format issued since July 2026 (IN RFB 2.229/2024): each char is
 * worth its ASCII code minus 48, the last two check digits stay numeric.
 */
export type TaxId = { type: 'br_cpf' | 'br_cnpj'; value: string }

const charValue = (c: string) => c.charCodeAt(0) - 48

function checkDigit(body: string, weights: number[], cpfStyle: boolean): number {
  const sum = body.split('').reduce((acc, c, i) => acc + charValue(c) * weights[i], 0)
  if (cpfStyle) {
    const r = (sum * 10) % 11
    return r === 10 ? 0 : r
  }
  const r = sum % 11
  return r < 2 ? 0 : 11 - r
}

function isValidCpf(d: string): boolean {
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false
  const d1 = checkDigit(d.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2], true)
  const d2 = checkDigit(d.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2], true)
  return d1 === Number(d[9]) && d2 === Number(d[10])
}

function isValidCnpj(d: string): boolean {
  if (!/^[0-9A-Z]{12}\d{2}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false
  const d1 = checkDigit(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], false)
  const d2 = checkDigit(d.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], false)
  return d1 === Number(d[12]) && d2 === Number(d[13])
}

/** Returns the Stripe tax ID (formatted like Stripe's examples) or null when invalid. */
export function parseTaxId(input: string): TaxId | null {
  const d = input.toUpperCase().replace(/[^0-9A-Z]/g, '')
  if (d.length === 11 && isValidCpf(d)) {
    return { type: 'br_cpf', value: `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` }
  }
  if (d.length === 14 && isValidCnpj(d)) {
    return {
      type: 'br_cnpj',
      value: `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`,
    }
  }
  return null
}
