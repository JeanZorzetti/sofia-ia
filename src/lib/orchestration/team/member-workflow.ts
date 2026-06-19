// src/lib/orchestration/team/member-workflow.ts
// Teams V2.1 — fatia S3.1 (Tema F1): PURE concatenation of a member's per-team
// `workflow` instruction onto the Agent's system prompt. Extracted out of
// chatWithAgent (groq.ts) so scripts/v21s5-verify.ts can assert it via tsx without
// dragging Prisma/Groq in — same pattern as task-history.ts (S2.1) /
// model-capabilities.ts (S1.2). No DB, no side effects.

/** Heading the workflow block is rendered under in the system prompt. Kept as a
 *  constant so the verify script can assert on it without hard-coding the string. */
export const MEMBER_WORKFLOW_HEADING = '## Workflow deste time'

/**
 * Append a member's per-team `workflow` instruction to its Agent's `systemPrompt`.
 *
 * S3.1 invariant (regression): an absent/null/empty/whitespace-only `workflow`
 * returns `systemPrompt` UNCHANGED (byte-identical), so a member without a workflow
 * runs exactly as it did before this slice. Only a non-empty instruction adds a
 * trailing block; the instruction is trimmed so stray leading/trailing whitespace
 * never bloats the prompt.
 */
export function appendMemberWorkflow(systemPrompt: string, workflow?: string | null): string {
  const trimmed = workflow?.trim()
  if (!trimmed) return systemPrompt
  return `${systemPrompt}\n\n${MEMBER_WORKFLOW_HEADING}\n${trimmed}`
}
