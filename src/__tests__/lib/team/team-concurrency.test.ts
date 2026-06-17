// src/__tests__/lib/team/team-concurrency.test.ts
// G3 — unit tests for the pure bounded-concurrency helper. Locks the two
// guarantees the graph coordinator relies on: at most `cap` calls in flight, and
// results collected in INPUT-INDEX order (not completion order).
import { runWithConcurrency } from '@/lib/orchestration/team/team-concurrency'

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

/** Run `total` items at concurrency `cap`, holding each call for 15ms so
 *  overlapping calls are observable; returns the peak simultaneous count. */
async function peakConcurrency(total: number, cap: number): Promise<{ max: number; len: number }> {
  let inFlight = 0
  let max = 0
  const res = await runWithConcurrency(Array.from({ length: total }, (_, i) => i), cap, async (i) => {
    inFlight++
    max = Math.max(max, inFlight)
    await delay(15)
    inFlight--
    return i
  })
  return { max, len: res.length }
}

describe('runWithConcurrency — bounded concurrency', () => {
  it('returns [] for empty input', async () => {
    expect(await runWithConcurrency([], 3, async x => x)).toEqual([])
  })

  it('collects results by input index, not completion order', async () => {
    // item 0 finishes LAST (longest delay); results must still be in index order.
    const n = 6
    const items = Array.from({ length: n }, (_, i) => i)
    const out = await runWithConcurrency(items, 3, async (i) => { await delay((n - i) * 4); return i * 10 })
    expect(out).toEqual(items.map(i => i * 10))
  })

  it('passes the index as the second arg', async () => {
    const idxs: number[] = []
    await runWithConcurrency(['a', 'b', 'c'], 2, async (_item, i) => { idxs.push(i); return i })
    expect(idxs.sort()).toEqual([0, 1, 2])
  })

  it('never exceeds the cap (peak equals cap when items > cap)', async () => {
    const { max, len } = await peakConcurrency(10, 3)
    expect(max).toBe(3)
    expect(len).toBe(10)
  })

  it('runs fully sequentially at cap=1 (peak 1)', async () => {
    const { max } = await peakConcurrency(5, 1)
    expect(max).toBe(1)
  })

  it('clamps a non-positive / fractional cap to ≥1', async () => {
    expect((await peakConcurrency(4, 0)).max).toBe(1)
    expect((await peakConcurrency(4, -2)).max).toBe(1)
    expect((await peakConcurrency(6, 2.9)).max).toBe(2) // floored to 2
  })

  it('caps to the item count when cap exceeds it', async () => {
    expect((await peakConcurrency(2, 9)).max).toBe(2)
  })
})
