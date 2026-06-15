// src/lib/orchestration/team/magic-roster.ts
// Pure parsing + validation of the LLM output for Team Magic Create.
// No DB, no network — safe to unit-test with scripts/sp1-verify.ts.
import { validateRoster } from './team-roster'

export type MagicRole = 'lead' | 'worker' | 'reviewer'

export interface MagicMember {
  role: MagicRole
  name: string
  systemPrompt: string
  model: string
}

export interface MagicRoster {
  name: string
  description: string
  members: MagicMember[]
}

export type ParseResult =
  | { ok: true; roster: MagicRoster }
  | { ok: false; error: string }

const DEFAULT_MODEL = 'llama-3.3-70b-versatile'
const VALID_ROLES = new Set<MagicRole>(['lead', 'worker', 'reviewer'])
const INVALID_JSON = 'O modelo retornou um JSON inválido. Tente novamente.'
const INVALID_STRUCTURE = 'Estrutura do time inválida. Tente novamente.'

/** Parses raw LLM content into a validated team roster, or returns an error message. */
export function parseMagicRoster(rawContent: string): ParseResult {
  let data: unknown
  try {
    // Strip a surrounding markdown fence if present (```json ... ``` or ``` ... ```),
    // anchored to the string boundaries so triple-backticks INSIDE a string value
    // (e.g. a systemPrompt that contains its own ```code``` block) are preserved.
    const jsonStr = rawContent
      .trim()
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```$/, '')
      .trim()
    data = JSON.parse(jsonStr)
  } catch {
    return { ok: false, error: INVALID_JSON }
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: INVALID_STRUCTURE }
  }
  const obj = data as Record<string, unknown>

  const name = typeof obj.name === 'string' ? obj.name.trim() : ''
  if (!name) return { ok: false, error: INVALID_STRUCTURE }

  if (!Array.isArray(obj.members) || obj.members.length === 0) {
    return { ok: false, error: INVALID_STRUCTURE }
  }

  const members: MagicMember[] = []
  for (const raw of obj.members) {
    if (!raw || typeof raw !== 'object') return { ok: false, error: INVALID_STRUCTURE }
    const m = raw as Record<string, unknown>
    const role = typeof m.role === 'string' ? m.role.trim().toLowerCase() : ''
    const memberName = typeof m.name === 'string' ? m.name.trim() : ''
    const systemPrompt = typeof m.systemPrompt === 'string' ? m.systemPrompt.trim() : ''
    if (!VALID_ROLES.has(role as MagicRole)) return { ok: false, error: INVALID_STRUCTURE }
    if (!memberName || !systemPrompt) return { ok: false, error: INVALID_STRUCTURE }
    const model = typeof m.model === 'string' && m.model.trim() ? m.model.trim() : DEFAULT_MODEL
    members.push({ role: role as MagicRole, name: memberName, systemPrompt, model })
  }

  // Composition gate — exactly the validator POST /api/teams uses (1 lead / ≥1 worker / ≤1 reviewer).
  // The real agentIds don't exist yet (agents are created later by the route), so we pass the index
  // as a non-empty placeholder purely to satisfy validateRoster's "every member needs an agentId" check.
  const composition = validateRoster(members.map((m, i) => ({ agentId: String(i), role: m.role })))
  if (composition) return { ok: false, error: composition }

  const description = typeof obj.description === 'string' ? obj.description.trim() : ''
  return { ok: true, roster: { name, description, members } }
}
