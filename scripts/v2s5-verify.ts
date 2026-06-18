// scripts/v2s5-verify.ts — Teams V2, S2.2: per-member token usage aggregation.
// Asserts the pure helper `member-usage.ts` (no jest, no React, no DB).
// Run: npx tsx scripts/v2s5-verify.ts
import assert from 'node:assert/strict'
import { aggregateUsageByMember, costForModel, FLAT_COST_PER_1M } from '../src/app/dashboard/teams/[id]/member-usage'

let passed = 0
function ok(label: string, condition: boolean) {
  assert.ok(condition, `FAIL: ${label}`)
  console.log(`  ✓ ${label}`)
  passed++
}

// ── (a) Conservation: Σ tokens per member === Σ tokens of non-null records ──
console.log('(a) conservation: Σ tokens per member matches input records')
{
  const records = [
    { memberId: 'm1', model: 'llama-3.3-70b-versatile', tokens: 1000 },
    { memberId: 'm1', model: 'llama-3.3-70b-versatile', tokens: 500 },
    { memberId: 'm2', model: 'llama3-8b-8192', tokens: 2000 },
    { memberId: 'm2', model: 'llama3-8b-8192', tokens: 300 },
  ]
  const result = aggregateUsageByMember(records)
  const m1 = result.find(r => r.memberId === 'm1')
  const m2 = result.find(r => r.memberId === 'm2')
  ok('m1 total tokens = 1500', m1?.tokens === 1500)
  ok('m2 total tokens = 2300', m2?.tokens === 2300)
  const totalIn = records.reduce((s, r) => s + r.tokens, 0)
  const totalOut = result.reduce((s, r) => s + r.tokens, 0)
  ok('Σ tokens conserved across members', totalIn === totalOut)
}

// ── (b) Null never leaks: null-member records go into null bucket only ──
console.log('(b) null-member records never leak into named members')
{
  const records = [
    { memberId: 'm1', model: null, tokens: 1000 },
    { memberId: null, model: null, tokens: 500 },
    { memberId: null, model: 'llama3-8b-8192', tokens: 200 },
  ]
  const result = aggregateUsageByMember(records)
  const m1 = result.find(r => r.memberId === 'm1')
  const nullBucket = result.find(r => r.memberId === null)
  ok('m1 tokens = 1000 (null records excluded)', m1?.tokens === 1000)
  ok('null bucket tokens = 700', nullBucket?.tokens === 700)
  ok('m1 result present exactly once', result.filter(r => r.memberId === 'm1').length === 1)
}

// ── (c) costForModel: known model uses correct rate; unknown/null falls back ──
console.log('(c) costForModel: known models + fallback')
{
  const tokensPerMillion = 1_000_000
  const flatRate = FLAT_COST_PER_1M
  ok('unknown model falls back to flat rate', Math.abs(costForModel('some-unknown-model', tokensPerMillion) - flatRate) < 0.001)
  ok('null model falls back to flat rate', Math.abs(costForModel(null, tokensPerMillion) - flatRate) < 0.001)
  ok('undefined model falls back to flat rate', Math.abs(costForModel(undefined, tokensPerMillion) - flatRate) < 0.001)
  // llama-3.3-70b-versatile = $0.59/1M
  ok('known model uses correct rate (llama-3.3-70b-versatile)', Math.abs(costForModel('llama-3.3-70b-versatile', tokensPerMillion) - 0.59) < 0.001)
  // llama3-8b-8192 = $0.05/1M
  ok('known model uses correct rate (llama3-8b-8192)', Math.abs(costForModel('llama3-8b-8192', tokensPerMillion) - 0.05) < 0.001)
  // 0 tokens → $0
  ok('zero tokens → zero cost', costForModel('llama-3.3-70b-versatile', 0) === 0)
}

// ── (d) Robustness: zero tokens + empty list ──
console.log('(d) robustness: zero tokens, empty list')
{
  const records = [
    { memberId: 'm1', model: null, tokens: 0 },
    { memberId: 'm2', model: null, tokens: 0 },
  ]
  const result = aggregateUsageByMember(records)
  const m1 = result.find(r => r.memberId === 'm1')
  ok('zero-token record does not crash', m1 !== undefined)
  ok('zero-token record has 0 tokens', m1?.tokens === 0)
  ok('zero-token record has 0 cost', m1?.cost === 0)
}
{
  const result = aggregateUsageByMember([])
  ok('empty list → empty result (no crash)', result.length === 0)
}

// ── (e) Per-member cost reflects per-model pricing ──
console.log('(e) per-member cost reflects per-model pricing')
{
  const records = [
    { memberId: 'm1', model: 'llama-3.3-70b-versatile', tokens: 1_000_000 }, // $0.59
    { memberId: 'm1', model: 'llama3-8b-8192', tokens: 1_000_000 },          // $0.05
  ]
  const result = aggregateUsageByMember(records)
  const m1 = result.find(r => r.memberId === 'm1')
  ok('m1 tokens = 2_000_000', m1?.tokens === 2_000_000)
  ok('m1 cost = $0.64 (sum of two model costs)', Math.abs((m1?.cost ?? 0) - 0.64) < 0.001)
}

console.log(`\n✅ v2s5 verify: ${passed} assertions passed`)
