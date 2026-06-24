// 005-agentic-companies — derivação PURA do roster de cada fase a partir da RACI (testável
// sem DB). Mapeamento (research R2):
//   A (Accountable) → lead (exatamente 1, garantido pela regra de ouro)
//   R (Responsible) → worker(s)
//   Na fase `testing`: o cargo de QA (R) entra como reviewer (≤1) → loop de desalucinação
//     comunicativa nativo do coordinator (lead→worker→reviewer). NENHUM loop reimplementado.
// O coordinator (`runTeam`) é apenas CHAMADO pelo meta-orquestrador (Princípio II).
import type { RosterInput } from '@/lib/orchestration/team/team-roster'
import type { SdlcPhase } from './sdlc'
import type { RaciMatrix } from './raci'

/** roleKey → agentId dos cargos OCUPADOS (vagos ficam de fora). */
export type Staffing = Record<string, string>

export type BuildRosterResult =
  | { ok: true; roster: RosterInput[] }
  | { ok: false; error: string }

export interface BuildPhaseRosterOptions {
  /** Cargo cujo R vira reviewer na fase de teste (default 'qa'). */
  qaRoleKey?: string
  /** Chave da fase de teste/QA (default 'testing'). */
  testingPhaseKey?: string
}

/**
 * Monta o roster do Time de uma fase. Retorna erro (fase bloqueada) se o A está vago ou se
 * nenhum R da fase está ocupado — nunca falha silenciosa (Edge Cases do spec).
 */
export function buildPhaseRoster(
  raci: RaciMatrix,
  phaseKey: string,
  staffing: Staffing,
  options: BuildPhaseRosterOptions = {}
): BuildRosterResult {
  const qaRoleKey = options.qaRoleKey ?? 'qa'
  const testingPhaseKey = options.testingPhaseKey ?? 'testing'

  const cells = raci?.[phaseKey] ?? {}
  const aRoles = Object.entries(cells).filter(([, v]) => v === 'A').map(([k]) => k)
  const rRoles = Object.entries(cells).filter(([, v]) => v === 'R').map(([k]) => k)

  if (aRoles.length !== 1) {
    return { ok: false, error: `Fase "${phaseKey}" precisa de exatamente 1 Accountable (A) — encontrou ${aRoles.length}` }
  }
  const aRole = aRoles[0]
  const leadAgent = staffing[aRole]
  if (!leadAgent) {
    return { ok: false, error: `Cargo Accountable "${aRole}" da fase "${phaseKey}" está vago` }
  }

  // Reviewer: só na fase de teste, e só se o cargo de QA for R e estiver ocupado.
  const isTesting = phaseKey === testingPhaseKey
  const reviewerRole = isTesting && rRoles.includes(qaRoleKey) && staffing[qaRoleKey] ? qaRoleKey : null

  const workerRoles = rRoles.filter(r => r !== reviewerRole && staffing[r])
  if (workerRoles.length === 0) {
    return { ok: false, error: `Nenhum cargo Responsável (R) ocupado na fase "${phaseKey}" — execução bloqueada` }
  }

  let position = 0
  const roster: RosterInput[] = [{ agentId: leadAgent, role: 'lead', position: position++ }]
  for (const r of workerRoles) roster.push({ agentId: staffing[r], role: 'worker', position: position++ })
  if (reviewerRole) roster.push({ agentId: staffing[reviewerRole], role: 'reviewer', position: position++ })

  return { ok: true, roster }
}

/**
 * Monta a missão textual da fase: objetivo da fase + missão global + artefato da fase
 * anterior (encadeamento N→N+1, FR-015a).
 */
export function phaseMission(phase: SdlcPhase, companyMission: string, prevArtifact: string | null): string {
  const parts: string[] = [
    `# Fase do SDLC: ${phase.label}`,
    `Objetivo desta fase: ${phase.objective}`,
    `Artefatos de saída esperados: ${phase.outputArtifacts.join(', ')}.`,
    '',
    `## Missão global da empresa`,
    companyMission.trim(),
  ]
  if (prevArtifact?.trim()) {
    parts.push('', `## Artefato da fase anterior (entrada para esta fase)`, prevArtifact.trim())
  }
  return parts.join('\n')
}
