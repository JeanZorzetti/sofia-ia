// 005-agentic-companies — validação da Matriz RACI (PURA, testável sem DB).
// Regra de ouro (FR-010): cada fase do SDLC tem EXATAMENTE 1 Accountable (A). Previne a
// "Armadilha do A" do blueprint (2 A → impasse) e a fase órfã (0 A → ninguém aprova).
import { SDLC_PHASES, type RaciValue } from './sdlc'

export type RaciMatrix = Record<string, Record<string, RaciValue>>

const VALID_VALUES: readonly string[] = ['R', 'A', 'C', 'I']

/**
 * Valida a RACI contra as 7 fases canônicas e os cargos existentes da empresa.
 * Retorna a mensagem de erro (uma só, a primeira encontrada) ou `null` se válida.
 */
export function validateRaci(raci: RaciMatrix, roleKeys: string[]): string | null {
  const roleSet = new Set(roleKeys)
  for (const phase of SDLC_PHASES) {
    const cells = raci?.[phase.key]
    if (!cells || typeof cells !== 'object') {
      return `Fase "${phase.label}" precisa de exatamente 1 Accountable (A)`
    }
    let aCount = 0
    for (const [roleKey, value] of Object.entries(cells)) {
      if (!VALID_VALUES.includes(value)) {
        return `Fase "${phase.label}": valor inválido "${value}" no cargo "${roleKey}" (use R, A, C ou I)`
      }
      if (!roleSet.has(roleKey)) {
        return `Fase "${phase.label}": cargo desconhecido "${roleKey}"`
      }
      if (value === 'A') aCount++
    }
    if (aCount !== 1) {
      return `Fase "${phase.label}" precisa de exatamente 1 Accountable (A) — encontrou ${aCount}`
    }
  }
  return null
}
