// 009-usecase-squads — Resolução de blueprint → roster concreto.
// PURO: sem I/O, testável em isolamento (análogo a buildPhaseRoster).
import type { SquadBlueprint, SquadBlueprintMember } from './squad-blueprint'
import type { Staffing } from './phase-roster'

export interface RosterEntry {
  agentId: string
  role: 'lead' | 'worker' | 'reviewer'
  position: number
}

export type BuildSquadRosterResult =
  | { ok: true; roster: RosterEntry[] }
  | { ok: false; skipped: true; reason: string }

/**
 * Valida a estrutura interna de um blueprint (sem staffing).
 * Erros indicam blueprints malformados (dados, não inputs do usuário).
 */
export function validateSquadBlueprint(blueprint: SquadBlueprint): { ok: true } | { ok: false; error: string } {
  if (!blueprint.squadKey?.trim()) return { ok: false, error: 'squadKey é obrigatório' }
  if (!blueprint.name?.trim()) return { ok: false, error: 'name é obrigatório' }
  if (!Array.isArray(blueprint.members) || blueprint.members.length === 0) {
    return { ok: false, error: 'members não pode ser vazio' }
  }
  const leads = blueprint.members.filter(m => m.role === 'lead')
  if (leads.length !== 1) {
    return { ok: false, error: `Blueprint deve ter exatamente 1 lead (encontrou ${leads.length})` }
  }
  const workers = blueprint.members.filter(m => m.role === 'worker')
  if (workers.length === 0 && blueprint.members.filter(m => m.role === 'reviewer').length > 0) {
    // reviewer sem worker é composição válida se o lead faz o trabalho — permitido
  }
  const validRoles = new Set(['lead', 'worker', 'reviewer'])
  const invalid = blueprint.members.find(m => !validRoles.has(m.role))
  if (invalid) return { ok: false, error: `role inválido: ${(invalid as SquadBlueprintMember).role}` }
  return { ok: true }
}

/**
 * Resolve blueprint → RosterEntry[], aplicando staffing.
 * Cargos vagos (sem agentId) são pulados.
 * Retorna `skipped: true` se o cargo lead está vago (squad não pode ser criado).
 */
export function buildSquadRoster(blueprint: SquadBlueprint, staffing: Staffing): BuildSquadRosterResult {
  const leadMember = blueprint.members.find(m => m.role === 'lead')
  if (!leadMember || !staffing[leadMember.roleKey]) {
    return {
      ok: false,
      skipped: true,
      reason: `Cargo lead "${leadMember?.roleKey ?? 'desconhecido'}" está vago — squad "${blueprint.squadKey}" pulado`,
    }
  }

  const roster: RosterEntry[] = []
  let position = 0

  for (const m of blueprint.members) {
    const agentId = staffing[m.roleKey]
    if (!agentId) continue // cargo vago — pula silenciosamente
    roster.push({ agentId, role: m.role, position: position++ })
  }

  // Invariante: deve ter pelo menos lead + algo (já garantido acima, mas defensivo).
  if (roster.length === 0) {
    return { ok: false, skipped: true, reason: `Roster vazio após aplicar staffing em "${blueprint.squadKey}"` }
  }

  return { ok: true, roster }
}
