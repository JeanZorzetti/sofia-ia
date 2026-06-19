// scripts/v21s7-verify.ts
// Local verification for Teams V2.1 — fatia S3.3 (Tema F3): per-member provider advisory chip
// (quota_exhausted / rate_limited / provider_overloaded), derived from the rate-limit the
// coordinators ALREADY raise. SURFACE only — no schema, no engine. The DECISION logic lives in a
// PURE helper (provider-advisory.ts); this asserts it via tsx — no jest (OneDrive errno -4094).
// Run: npx tsx scripts/v21s7-verify.ts
//
// Required cases (ROADMAP S3.3 + Sessão 8.md, line 57):
//   (a) classifyProviderError maps REAL provider error samples (claude-token-pool / isRateLimit
//       regex / the coordinators' generic phase phrase) → the right category.
//   (b) unknown error / success / normal failure → null (regression: no chip = legacy panel);
//       status === 'rate_limited' with no text → falls back to 'rate_limited'.
//   (c) pickAdvisoryMemberId (read-side attribution, decision A) chooses the right member from the
//       frozen board/feed: doing→owner, review→reviewer, planning/consolidation→lead, else last
//       author, else null.
import assert from 'node:assert/strict'
import {
  classifyProviderError,
  pickAdvisoryMemberId,
  type AdvisoryMember,
  type AdvisoryTask,
  type AdvisoryMessage,
} from '../src/lib/orchestration/team/provider-advisory'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

function main() {
  // ── (a) classify maps real provider error samples to the right category ──
  console.log('(a) classifyProviderError mapeia amostras reais → categoria certa')
  {
    // rate_limited: 429 / "rate limit" / Claude session-limit message / coordinator phase phrase.
    assert.equal(classifyProviderError('429 Too Many Requests', 'failed'), 'rate_limited')
    assert.equal(classifyProviderError('Rate limit exceeded, please retry', 'failed'), 'rate_limited')
    assert.equal(
      classifyProviderError("Todas as 2 conta(s) Claude no limite. Último erro: You've hit your session limit · resets 5pm (UTC)", 'rate_limited'),
      'rate_limited',
    )
    assert.equal(classifyProviderError('Rate limit durante execução', 'rate_limited'), 'rate_limited')

    // quota_exhausted: quota / usage|weekly|monthly limit / billing / "exceeded your".
    assert.equal(classifyProviderError('You have exceeded your monthly quota', 'failed'), 'quota_exhausted')
    assert.equal(classifyProviderError('usage limit reached for this account', 'rate_limited'), 'quota_exhausted')
    assert.equal(classifyProviderError('Insufficient credit / billing issue', 'failed'), 'quota_exhausted')

    // provider_overloaded: 503 / overloaded / service unavailable.
    assert.equal(classifyProviderError('Overloaded', 'failed'), 'provider_overloaded')
    assert.equal(classifyProviderError('503 Service Unavailable', 'failed'), 'provider_overloaded')

    // ordering: overload wins over a co-occurring rate-limit phrase; quota wins over plain limit.
    assert.equal(classifyProviderError('rate limit hit and server overloaded', 'rate_limited'), 'provider_overloaded')
    assert.equal(classifyProviderError('quota exceeded — too many requests', 'rate_limited'), 'quota_exhausted')
    ok('(a) 429/rate-limit/session-limit/fase→rate_limited; quota/usage/billing→quota_exhausted; 503/overloaded→provider_overloaded')
  }

  // ── (b) regression: no signal → null; status fallback for rate_limited ──
  console.log('(b) sem sinal → null (sem chip = legado); status rate_limited sem texto → fallback')
  {
    assert.equal(classifyProviderError(null, 'completed'), null, 'run OK → null')
    assert.equal(classifyProviderError('', null), null, 'erro vazio sem status → null')
    assert.equal(classifyProviderError(undefined, undefined), null, 'undefined/undefined → null')
    assert.equal(classifyProviderError('TypeError: cannot read x of undefined', 'failed'), null, 'falha normal → null')
    assert.equal(classifyProviderError('git push rejected', 'failed'), null, 'erro de entrega não-provider → null')
    // status fallback: coordinator stored no usable text but finished rate_limited.
    assert.equal(classifyProviderError(null, 'rate_limited'), 'rate_limited', 'status rate_limited sem texto → rate_limited')
    // text always wins over status.
    assert.equal(classifyProviderError('quota exhausted', 'rate_limited'), 'quota_exhausted', 'texto vence o status')
    ok('(b) desconhecido/sucesso/falha-normal → null; rate_limited sem texto → fallback; texto > status')
  }

  // ── (c) read-side attribution picks the right member ──
  console.log('(c) pickAdvisoryMemberId escolhe o membro certo (heurística read-side)')
  {
    const members: AdvisoryMember[] = [
      { id: 'lead1', role: 'lead' },
      { id: 'w1', role: 'worker' },
      { id: 'w2', role: 'worker' },
      { id: 'rev1', role: 'reviewer' },
    ]
    const noMsgs: AdvisoryMessage[] = []

    // 1. Execution: a task in `doing` → its owner.
    const doingBoard: AdvisoryTask[] = [
      { assigneeId: 'w1', status: 'done' },
      { assigneeId: 'w2', status: 'doing' },
    ]
    assert.equal(pickAdvisoryMemberId(members, doingBoard, noMsgs), 'w2', 'doing → owner do task')

    // 2. Review: a task in `review` (no doing) → the reviewer.
    const reviewBoard: AdvisoryTask[] = [
      { assigneeId: 'w1', status: 'done' },
      { assigneeId: 'w2', status: 'review' },
    ]
    assert.equal(pickAdvisoryMemberId(members, reviewBoard, noMsgs), 'rev1', 'review → reviewer')

    // doing takes precedence over review.
    const bothBoard: AdvisoryTask[] = [
      { assigneeId: 'w1', status: 'doing' },
      { assigneeId: 'w2', status: 'review' },
    ]
    assert.equal(pickAdvisoryMemberId(members, bothBoard, noMsgs), 'w1', 'doing tem precedência sobre review')

    // 3. Planning/consolidation: no live task → the lead.
    const settledBoard: AdvisoryTask[] = [
      { assigneeId: 'w1', status: 'done' },
      { assigneeId: 'w2', status: 'done' },
    ]
    assert.equal(pickAdvisoryMemberId(members, settledBoard, noMsgs), 'lead1', 'sem task viva → lead (planejamento/consolidação)')
    assert.equal(pickAdvisoryMemberId(members, [], noMsgs), 'lead1', 'planejamento (board vazio) → lead')

    // 4. Fallback: no lead in roster, no live task → last message author.
    const noLead: AdvisoryMember[] = [{ id: 'w1', role: 'worker' }, { id: 'w2', role: 'worker' }]
    const msgs: AdvisoryMessage[] = [{ fromMemberId: 'w1' }, { fromMemberId: null }, { fromMemberId: 'w2' }]
    assert.equal(pickAdvisoryMemberId(noLead, [], msgs), 'w2', 'sem lead → último autor de mensagem')

    // 5. Nothing to blame → null (→ no per-member chip; run-level Erro box still shows).
    assert.equal(pickAdvisoryMemberId(noLead, [], noMsgs), null, 'sem task/lead/mensagem → null')
    // a doing task assigned to someone OUTSIDE the roster is ignored (guard), falls through to lead.
    const orphanDoing: AdvisoryTask[] = [{ assigneeId: 'ghost', status: 'doing' }]
    assert.equal(pickAdvisoryMemberId(members, orphanDoing, noMsgs), 'lead1', 'assignee fora do roster é ignorado')
    ok('(c) doing→owner, review→reviewer (doing>review), sem task→lead, fallback→último autor, nada→null')
  }

  console.log(`\n✅ v21s7 verify: ${passed} assertions passed`)
}

main()
