// src/lib/orchestration/team/provider-advisory.ts
// Teams V2.1 — fatia S3.3 (Tema F3): per-member provider advisory. PURE decision logic
// (no React, no DB, no SSE, no side effects) so scripts/v21s7-verify.ts can assert it via tsx
// without dragging React in — same pattern as task-relations.ts (S3.2) and member-stats.ts (S2.1).
//
// ⚠️ Nature of this slice (Sessão 8): SURFACE of what already exists — no new engine, no schema.
// The rate-limit is ALREADY raised by chat() (isRateLimit / claude-token-pool), and the two
// coordinators ALREADY finish the run as `rate_limited`, storing a string error. This module only
// (1) refines that run-level error/status into one of three categories, and (2) heuristically
// picks WHICH member to pin the chip on — read-side, zero schema (decision A confirmed with user).
// The honest run-level truth still lives in the existing "Erro" box below the panel.

export type ProviderAdvisory = 'quota_exhausted' | 'rate_limited' | 'provider_overloaded'

/**
 * Classify a run's provider failure into one advisory category, or `null` (= no chip = legacy
 * board). Operates on the run-level `error` string + terminal `status` — the same material the
 * SSE already delivers. The error text is the strong signal (so a `failed` run whose message says
 * "Overloaded" still surfaces `provider_overloaded`); `status === 'rate_limited'` is the fallback
 * when the coordinator stored only its generic phase phrase ("Rate limit durante execução").
 *
 * Order matters — the categories overlap textually, so the most specific patterns win first:
 *   1. provider_overloaded — provider is up but capacity-limited (503 / overloaded / unavailable)
 *   2. quota_exhausted     — the account's allotment is spent (quota / usage|weekly|monthly limit)
 *   3. rate_limited        — temporary throttle (rate limit / 429 / "hit your limit" / resets)
 * Unknown text + non-rate-limited status → null (regression: success/normal-failure = no chip).
 */
export function classifyProviderError(
  error: string | null | undefined,
  status?: string | null,
): ProviderAdvisory | null {
  const text = (error ?? '').toLowerCase()

  if (text) {
    // 1. Provider overloaded / temporarily unavailable (capacity, not the account's fault).
    if (/overloaded|over[\s_-]?capacity|service unavailable|\b503\b|temporarily unavailable/.test(text)) {
      return 'provider_overloaded'
    }
    // 2. Quota / usage allotment exhausted — hard ceiling, longer reset.
    if (/\bquota\b|usage limit|(weekly|monthly|daily) limit|credit|billing|insufficient|exceeded your/.test(text)) {
      return 'quota_exhausted'
    }
    // 3. Generic rate-limit / throttle (also matches the coordinator's "Rate limit durante …").
    if (/rate[\s_-]?limit|too many requests|\b429\b|hit your .{0,30}?limit|limit reached|\bresets?\b/.test(text)) {
      return 'rate_limited'
    }
  }

  // No textual signal, but the run terminated as rate_limited → default to the generic category.
  if (status === 'rate_limited') return 'rate_limited'
  return null
}

/** Minimal member shape — structurally satisfied by the panel's `MemberLike` ({ id, role, … }). */
export interface AdvisoryMember { id: string; role: string }
/** Minimal task shape — structurally satisfied by the panel's `TaskLike`. */
export interface AdvisoryTask { assigneeId: string | null; status: string }
/** Minimal message shape — structurally satisfied by the panel's `MessageLike`. */
export interface AdvisoryMessage { fromMemberId: string | null }

/**
 * Heuristic read-side attribution (decision A): given the FROZEN board/feed at the moment the run
 * ended, pick the single member most likely to have hit the provider limit. The error is run-level
 * (TeamRun.error/status), so this is a best-effort guess — the run-level "Erro" box stays the
 * source of truth. Returns `null` when no member can be reasonably blamed (→ no per-member chip).
 *
 * Priority mirrors the coordinator phases (execução / review / planejamento|consolidação):
 *   1. A task still in `doing` → its owner was mid-chat when the limit threw (execution phase).
 *   2. A task in `review` → the reviewer was acting (review phase).
 *   3. No live task → planning/consolidation, which is the lead's phase.
 *   4. Fallback → the last member to author a message.
 */
export function pickAdvisoryMemberId(
  members: AdvisoryMember[],
  tasks: AdvisoryTask[],
  messages: AdvisoryMessage[],
): string | null {
  const inRoster = (id: string | null | undefined): id is string =>
    !!id && members.some(m => m.id === id)

  // 1. Execution: a task in progress → its owner hit the limit mid-chat.
  const doing = tasks.find(t => t.status === 'doing' && inRoster(t.assigneeId))
  if (doing) return doing.assigneeId!

  // 2. Review: a task awaiting review → the reviewer was the one acting.
  if (tasks.some(t => t.status === 'review')) {
    const reviewer = members.find(m => m.role === 'reviewer')
    if (reviewer) return reviewer.id
  }

  // 3. Planning / consolidation (no live task) → the lead's phase.
  const lead = members.find(m => m.role === 'lead')
  if (lead) return lead.id

  // 4. Fallback: the last member to author a message.
  for (let i = messages.length - 1; i >= 0; i--) {
    const id = messages[i].fromMemberId
    if (inRoster(id)) return id
  }
  return null
}
