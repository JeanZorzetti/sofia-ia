// src/lib/orchestration/team/team-concurrency.ts
// G3 — bounded-concurrency helper. Pure (no I/O): the only primitive the graph
// coordinator needs to fan out a bucket of tasks while keeping at most `cap`
// in flight. Testable in isolation (tsx + jest) — no DB, no network.

/**
 * Run `fn` over `items` with at most `cap` calls in flight at once, returning
 * results in INPUT-INDEX order (results[i] === await fn(items[i], i)) — not in
 * completion order.
 *
 * Worker-pool design: spawn `min(cap, items.length)` runners; each runner
 * synchronously claims the next index (`next++` is atomic in single-threaded JS,
 * so no two runners get the same item) and awaits its `fn`. At any instant the
 * number of pending `fn` calls equals the number of runners currently inside
 * `await fn(...)`, which is ≤ the number of runners ≤ `cap` — the concurrency
 * cap holds.
 *
 * `cap` is clamped to an integer ≥ 1 (a non-positive or fractional cap falls
 * back to 1, i.e. sequential). With `cap === 1` the result is a plain in-order
 * sequential map.
 *
 * Error handling is left to the CALLER: this helper does not catch. If `fn`
 * rejects, the rejection propagates (Promise.all-style). The graph coordinator
 * passes an `fn` that never throws — it returns a tagged result — so the fan-out
 * always settles and the terminal decision (rate-limit / cancel / error) is made
 * once, after, from the collected results.
 */
export async function runWithConcurrency<T, R>(
  items: readonly T[],
  cap: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const n = items.length
  if (n === 0) return []
  const limit = Math.min(Math.max(1, Math.floor(cap) || 1), n)
  const results = new Array<R>(n)
  let next = 0

  async function runner(): Promise<void> {
    // Claim-and-process until the shared cursor is exhausted. `next++` reads and
    // increments in one tick (no await between), so each index is taken once.
    for (let i = next++; i < n; i = next++) {
      results[i] = await fn(items[i], i)
    }
  }

  await Promise.all(Array.from({ length: limit }, () => runner()))
  return results
}
