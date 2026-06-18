// src/app/dashboard/teams/[id]/member-usage.ts
// Teams V2 — S2.2: PURE per-member usage aggregation (no React, no DB, no side effects).
// Consumed by MemberActivityPanel (React) and scripts/v2s5-verify.ts (tsx).
// Key invariants:
//   - null memberId records are bucketed separately and NEVER attributed to any member.
//   - costForModel uses per-model pricing when known; falls back to FLAT_COST_PER_1M.
//   - Run-level flat cost (coordinator) stays untouched — this is display-only.

// Flat rate used as fallback for unknown or null models.
// Aligned with COST_PER_1M_TOKENS in team-coordinator.ts / team-graph-coordinator.ts.
export const FLAT_COST_PER_1M = 0.5

// USD per 1M tokens (output price used as rough proxy for mixed input+output totals).
const MODEL_PRICE_PER_1M: Record<string, number> = {
  'llama-3.3-70b-versatile': 0.59,
  'llama-3.1-70b-versatile': 0.59,
  'llama-3.1-8b-instant': 0.08,
  'llama3-8b-8192': 0.05,
  'llama3-70b-8192': 0.79,
  'mixtral-8x7b-32768': 0.24,
  'gemma2-9b-it': 0.20,
  'gemma-7b-it': 0.10,
  'qwen-qwq-32b': 0.39,
  'deepseek-r1-distill-llama-70b': 0.75,
  'meta-llama/llama-4-scout-17b-16e-instruct': 0.11,
  'meta-llama/llama-4-maverick-17b-128e-instruct': 0.50,
}

export interface UsageRecord {
  memberId: string | null
  model: string | null
  tokens: number
}

export interface MemberUsageStat {
  memberId: string | null
  tokens: number
  cost: number
}

/** Cost in USD for a given model + token count. Falls back to FLAT_COST_PER_1M. */
export function costForModel(model: string | null | undefined, tokens: number): number {
  const rate = (model ? MODEL_PRICE_PER_1M[model] : undefined) ?? FLAT_COST_PER_1M
  return (tokens / 1_000_000) * rate
}

/** Aggregate usage records into per-member totals.
 *  - Records with null memberId go into a null bucket (never attributed to any member).
 *  - Cost is summed per model so mixed-model members get accurate cost attribution. */
export function aggregateUsageByMember(records: UsageRecord[]): MemberUsageStat[] {
  // Map from memberId (or null) → { tokens, costByModel }
  const byMember = new Map<string | null, { tokens: number; cost: number }>()

  for (const r of records) {
    const key = r.memberId ?? null
    let entry = byMember.get(key)
    if (!entry) {
      entry = { tokens: 0, cost: 0 }
      byMember.set(key, entry)
    }
    entry.tokens += r.tokens ?? 0
    entry.cost += costForModel(r.model, r.tokens ?? 0)
  }

  return Array.from(byMember.entries()).map(([memberId, { tokens, cost }]) => ({
    memberId,
    tokens,
    cost,
  }))
}
