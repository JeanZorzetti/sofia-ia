// src/lib/orchestration/team/team-roster.ts
// Pure validation for a team roster submitted to POST /api/teams.
import type { CapabilityPolicy } from './team-types'

export interface RosterInput {
  agentId: string
  role: string
  model?: string | null
  effort?: string | null
  position?: number
  /** S1.3: per-member tool-capability policy persisted to `TeamMember.capabilities`.
   *  Absent/null → no policy (legacy gate). `validateRoster` stays permissive (no new
   *  rule); the runtime gate (S1.2) interprets it. */
  capabilities?: CapabilityPolicy | null
  /** S3.1: per-member custom workflow instruction persisted to `TeamMember.workflow`.
   *  Absent/null/empty → only the Agent's own system prompt (legacy). No validation rule. */
  workflow?: string | null
}

const VALID_ROLES = new Set(['lead', 'worker', 'reviewer'])

/** Returns an error message, or null if the roster is valid. */
export function validateRoster(members: RosterInput[]): string | null {
  if (!Array.isArray(members) || members.length === 0) return 'Roster vazio'
  if (members.some(m => !VALID_ROLES.has(m.role))) return 'Papel inválido (use lead|worker|reviewer)'
  if (members.filter(m => m.role === 'lead').length !== 1) return 'O time precisa de exatamente 1 Lead'
  if (!members.some(m => m.role === 'worker')) return 'O time precisa de ao menos 1 Worker'
  if (members.filter(m => m.role === 'reviewer').length > 1) return 'No máximo 1 Reviewer'
  if (members.some(m => !m.agentId)) return 'Todo membro precisa de um agentId'
  return null
}
