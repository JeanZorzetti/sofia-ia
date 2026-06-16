/**
 * Unit tests for src/lib/analytics/aggregate.ts (Sprint 2 — performance).
 *
 * These helpers replace the per-entity N+1 loops in the analytics routes with
 * in-memory rollups over batched queries. The tests pin the rollup behaviour so
 * the migration to `groupBy` keeps the exact same numbers the routes returned.
 */
import {
  countByKey,
  nestedCount,
  responseTimeByAgent,
  avgOrZero,
  rate,
  round2,
  type CountedGroup,
} from '@/lib/analytics/aggregate'

describe('countByKey', () => {
  it('indexes groupBy rows by a string key', () => {
    const groups: CountedGroup[] = [
      { agentId: 'a', _count: { _all: 3 } },
      { agentId: 'b', _count: { _all: 7 } },
    ]
    const map = countByKey(groups, 'agentId')
    expect(map.get('a')).toBe(3)
    expect(map.get('b')).toBe(7)
    expect(map.get('missing')).toBeUndefined()
  })

  it('skips rows whose key is not a string (e.g. null agentId)', () => {
    const groups = [{ agentId: null, _count: { _all: 5 } }] as unknown as CountedGroup[]
    expect(countByKey(groups, 'agentId').size).toBe(0)
  })
})

describe('nestedCount', () => {
  it('indexes by outer then inner key', () => {
    const groups: CountedGroup[] = [
      { flowId: 'f1', status: 'success', _count: { _all: 2 } },
      { flowId: 'f1', status: 'failed', _count: { _all: 1 } },
      { flowId: 'f2', status: 'pending', _count: { _all: 4 } },
    ]
    const map = nestedCount(groups, 'flowId', 'status')
    expect(map.get('f1')?.get('success')).toBe(2)
    expect(map.get('f1')?.get('failed')).toBe(1)
    expect(map.get('f2')?.get('pending')).toBe(4)
    expect(map.get('f1')?.get('pending')).toBeUndefined()
  })
})

describe('responseTimeByAgent', () => {
  it('pairs each user message with the next assistant message', () => {
    const base = new Date('2026-06-16T10:00:00Z').getTime()
    const map = responseTimeByAgent([
      {
        agentId: 'a',
        messages: [
          { sender: 'user', sentAt: new Date(base) },
          { sender: 'assistant', sentAt: new Date(base + 5_000) }, // 5s
          { sender: 'user', sentAt: new Date(base + 10_000) },
          { sender: 'assistant', sentAt: new Date(base + 13_000) }, // 3s
        ],
      },
    ])
    expect(map.get('a')).toEqual({ total: 8, count: 2 })
  })

  it('does not count assistant→assistant or user→user adjacency', () => {
    const base = Date.now()
    const map = responseTimeByAgent([
      {
        agentId: 'a',
        messages: [
          { sender: 'user', sentAt: new Date(base) },
          { sender: 'user', sentAt: new Date(base + 1_000) },
          { sender: 'assistant', sentAt: new Date(base + 2_000) },
          { sender: 'assistant', sentAt: new Date(base + 3_000) },
        ],
      },
    ])
    // only the user(1s)→assistant(2s) pair counts → 1s
    expect(map.get('a')).toEqual({ total: 1, count: 1 })
  })

  it('aggregates across multiple conversations of the same agent', () => {
    const base = Date.now()
    const conv = (offset: number) => ({
      agentId: 'a',
      messages: [
        { sender: 'user', sentAt: new Date(base + offset) },
        { sender: 'assistant', sentAt: new Date(base + offset + 2_000) },
      ],
    })
    const map = responseTimeByAgent([conv(0), conv(100_000)])
    expect(map.get('a')).toEqual({ total: 4, count: 2 })
  })

  it('ignores conversations with a null agentId', () => {
    const map = responseTimeByAgent([{ agentId: null, messages: [] }])
    expect(map.size).toBe(0)
  })
})

describe('avgOrZero / rate / round2', () => {
  it('avgOrZero divides total by count, 0 when empty', () => {
    expect(avgOrZero({ total: 8, count: 2 })).toBe(4)
    expect(avgOrZero({ total: 0, count: 0 })).toBe(0)
    expect(avgOrZero(undefined)).toBe(0)
  })

  it('rate returns a percentage, 0 when denominator is 0', () => {
    expect(rate(1, 4)).toBe(25)
    expect(rate(5, 0)).toBe(0)
  })

  it('round2 rounds to two decimals', () => {
    expect(round2(33.33333)).toBe(33.33)
    expect(round2(100)).toBe(100)
  })
})
