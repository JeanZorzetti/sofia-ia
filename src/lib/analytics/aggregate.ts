/**
 * Pure aggregation helpers for the analytics endpoints.
 *
 * Sprint 2 (performance): the agents/workflows analytics routes used to run a
 * handful of queries *per entity* (the classic N+1). They now run a fixed number
 * of batched `groupBy`/`findMany` queries and roll the results up in memory using
 * the helpers below. Keeping the rollup logic pure makes it unit-testable without
 * a database and avoids duplicating it across routes.
 */

/** A Prisma `groupBy` row carrying a total count (`_count: { _all }`). */
export type CountedGroup = Record<string, unknown> & { _count: { _all: number } };

/**
 * Index `groupBy` rows by a single string key → total count.
 * Rows whose key is not a string are skipped.
 */
export function countByKey(groups: CountedGroup[], key: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const g of groups) {
    const k = g[key];
    if (typeof k === 'string') map.set(k, g._count._all);
  }
  return map;
}

/**
 * Index `groupBy` rows by an outer key, then an inner key → total count.
 * Used for `[flowId, status]` style groupings so we can read, e.g.,
 * `counts.get(flowId)?.get('success')` without re-querying per status.
 */
export function nestedCount(
  groups: CountedGroup[],
  outerKey: string,
  innerKey: string,
): Map<string, Map<string, number>> {
  const map = new Map<string, Map<string, number>>();
  for (const g of groups) {
    const o = g[outerKey];
    const i = g[innerKey];
    if (typeof o !== 'string' || typeof i !== 'string') continue;
    let inner = map.get(o);
    if (!inner) {
      inner = new Map();
      map.set(o, inner);
    }
    inner.set(i, g._count._all);
  }
  return map;
}

export interface TimelineMessage {
  sender: string;
  sentAt: Date;
}

export interface TimedConversation {
  agentId: string | null;
  messages: TimelineMessage[];
}

/**
 * Sum response times per agent, in seconds, by pairing each `user` message with
 * the immediately following `assistant` message (same logic the per-agent loop
 * used before, just rolled up across all conversations in one pass).
 */
export function responseTimeByAgent(
  conversations: TimedConversation[],
): Map<string, { total: number; count: number }> {
  const map = new Map<string, { total: number; count: number }>();
  for (const conv of conversations) {
    if (!conv.agentId) continue;
    const acc = map.get(conv.agentId) ?? { total: 0, count: 0 };
    for (let i = 0; i < conv.messages.length - 1; i++) {
      const current = conv.messages[i];
      const next = conv.messages[i + 1];
      if (current.sender === 'user' && next.sender === 'assistant') {
        acc.total += (next.sentAt.getTime() - current.sentAt.getTime()) / 1000;
        acc.count += 1;
      }
    }
    map.set(conv.agentId, acc);
  }
  return map;
}

/** Mean of `total / count`, or 0 when there were no pairs. */
export function avgOrZero(stat: { total: number; count: number } | undefined): number {
  if (!stat || stat.count === 0) return 0;
  return stat.total / stat.count;
}

/** Percentage `numerator / denominator * 100`, or 0 when denominator is 0. */
export function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

/** Round to 2 decimal places (matches the existing `Math.round(x * 100) / 100`). */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
