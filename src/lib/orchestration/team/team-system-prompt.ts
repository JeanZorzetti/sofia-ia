// src/lib/orchestration/team/team-system-prompt.ts
// Teams V2.2 — fatia S3 (item 3): PURE concatenation of a TEAM-wide system prompt
// (shared culture / guard-rails / tone) onto each member's system prompt. Extracted
// out of chatWithAgent (groq.ts) so scripts/v22s3-verify.ts can assert it via tsx
// without dragging Prisma/Groq in — same pattern as member-workflow.ts (S3.1) /
// task-history.ts (S2.1). No DB, no side effects.
//
// Persistence: the text lives in `Team.config.systemPrompt` (a free-form JSON blob,
// no migration). Injection: baked into the chat wrapper at the run caller
// (start-team-run.ts), NOT the coordinator — same passthrough discipline as the cycle.

/** Heading the team block is rendered under. Mirrors MEMBER_WORKFLOW_HEADING from S3.1
 *  so the verify script can assert on it without hard-coding the literal elsewhere. */
export const TEAM_SYSTEM_PROMPT_HEADING = '## Diretrizes do time'

/**
 * Append a TEAM-wide system prompt to a member's `systemPrompt`.
 *
 * S3 invariant (regression): an absent/null/empty/whitespace-only `teamSystemPrompt`
 * returns `systemPrompt` UNCHANGED (byte-identical), so a team without a configured
 * prompt runs exactly as it did before this slice. Only a non-empty value adds a
 * trailing block; the text is trimmed so stray whitespace never bloats the prompt.
 *
 * Position in the stack (decision confirmed with the user, S3): the team block sits
 * BETWEEN the Agent's own prompt and the per-member workflow (agente → time →
 * workflow), so the team is shared culture and the workflow (most specific) colors
 * last. Callers apply this BEFORE appendMemberWorkflow.
 */
export function appendTeamSystemPrompt(systemPrompt: string, teamSystemPrompt?: string | null): string {
  const trimmed = teamSystemPrompt?.trim()
  if (!trimmed) return systemPrompt
  return `${systemPrompt}\n\n${TEAM_SYSTEM_PROMPT_HEADING}\n${trimmed}`
}

/**
 * Read the team system prompt out of a persisted `Team.config` blob. Returns the
 * trimmed string, or `null` when absent / non-string / empty (→ legacy: no block).
 * Pure so the chat wrapper can resolve it once per run without touching Prisma here.
 */
export function readTeamSystemPrompt(config: unknown): string | null {
  if (!config || typeof config !== 'object') return null
  const raw = (config as Record<string, unknown>).systemPrompt
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed ? trimmed : null
}
