// scripts/sp2-verify.ts — SP2 pure-logic verification (tsx, node:assert, fake fetch).
// Run: npx tsx scripts/sp2-verify.ts
import assert from 'node:assert'
import { createHmac } from 'node:crypto'
import { dispatchOutputWebhooks } from '../src/lib/orchestration/output-webhooks'
import { buildTeamDispatchArgs } from '../src/lib/orchestration/team/team-outputs'

process.env.RESEND_API_KEY = 'test-resend-key' // make the email path actually fetch

interface Captured { url: string; headers: Record<string, string>; body: string }
let calls: Captured[] = []

function installFakeFetch() {
  calls = []
  ;(globalThis as any).fetch = async (url: string, init: any = {}) => {
    calls.push({
      url: String(url),
      headers: (init.headers ?? {}) as Record<string, string>,
      body: typeof init.body === 'string' ? init.body : JSON.stringify(init.body ?? ''),
    })
    return { ok: true, status: 200, text: async () => '' } as any
  }
}

async function testWebhookHmacAndDefaultEvent() {
  installFakeFetch()
  const secret = 'shhh'
  await dispatchOutputWebhooks(
    { id: 'orch1', name: 'Pipeline X', config: { outputWebhooks: [{ type: 'webhook', url: 'https://hook.test/x', enabled: true, secret }] } },
    { id: 'exec1', durationMs: 1234, tokensUsed: 50 },
    { result: 'ok' },
  )
  assert.equal(calls.length, 1, 'one webhook dispatched')
  const sig = calls[0].headers['X-Polaris-Signature']
  assert.ok(sig, 'X-Polaris-Signature header present (normalized name, no space)')
  const expected = 'sha256=' + createHmac('sha256', secret).update(calls[0].body).digest('hex')
  assert.equal(sig, expected, 'HMAC signature matches the sent body')
  const payload = JSON.parse(calls[0].body)
  assert.equal(payload.event, 'orchestration.completed', 'default event (no opts) = orchestration.completed')
  console.log('✓ webhook HMAC header + default event')
}

async function testWebhookTeamEvent() {
  installFakeFetch()
  await dispatchOutputWebhooks(
    { id: 't1', name: 'Time X', config: { outputWebhooks: [{ type: 'webhook', url: 'https://hook.test/x', enabled: true }] } },
    { id: 'run1', durationMs: 10, tokensUsed: 5 },
    { result: 'done' },
    { completedLabel: 'Time concluído', event: 'team.completed' },
  )
  const payload = JSON.parse(calls[0].body)
  assert.equal(payload.event, 'team.completed', 'opts.event overrides to team.completed')
  console.log('✓ webhook team event override')
}

async function testOnlyEnabledDispatched() {
  installFakeFetch()
  await dispatchOutputWebhooks(
    { id: 't1', name: 'Time X', config: { outputWebhooks: [
      { type: 'webhook', url: 'https://hook.test/on', enabled: true },
      { type: 'webhook', url: 'https://hook.test/off', enabled: false },
    ] } },
    { id: 'run1', durationMs: 10, tokensUsed: 5 },
    'output',
  )
  assert.equal(calls.length, 1, 'only the enabled webhook is dispatched')
  assert.ok(calls[0].url.endsWith('/on'), 'the enabled URL was called')
  console.log('✓ only enabled outputs dispatched')
}

async function testSlackLabel() {
  installFakeFetch()
  await dispatchOutputWebhooks(
    { id: 't1', name: 'Time X', config: { outputWebhooks: [{ type: 'slack', webhookUrl: 'https://hooks.slack.com/x', enabled: true }] } },
    { id: 'run1', durationMs: 2000, tokensUsed: 5 },
    'output',
    { completedLabel: 'Time concluído', event: 'team.completed' },
  )
  assert.ok(calls[0].body.includes('Time concluído'), 'slack uses opts.completedLabel')
  console.log('✓ slack completedLabel (team)')
}

async function testSlackDefaultLabel() {
  installFakeFetch()
  await dispatchOutputWebhooks(
    { id: 'o1', name: 'Pipeline', config: { outputWebhooks: [{ type: 'slack', webhookUrl: 'https://hooks.slack.com/x', enabled: true }] } },
    { id: 'e1', durationMs: 2000, tokensUsed: 5 },
    'output',
  )
  assert.ok(calls[0].body.includes('Orquestração concluída'), 'slack default label preserved (regression)')
  console.log('✓ slack default label (regression)')
}

async function testEmailLabel() {
  installFakeFetch()
  await dispatchOutputWebhooks(
    { id: 't1', name: 'Time X', config: { outputWebhooks: [{ type: 'email', to: 'a@b.com', enabled: true }] } },
    { id: 'run1', durationMs: 2000, tokensUsed: 5 },
    'output',
    { completedLabel: 'Time concluído', event: 'team.completed' },
  )
  assert.equal(calls.length, 1, 'email dispatched to Resend')
  assert.ok(calls[0].url.includes('api.resend.com'), 'calls Resend API')
  assert.ok(calls[0].body.includes('Time concluído'), 'email uses opts.completedLabel')
  console.log('✓ email completedLabel (team)')
}

function runLike(over: Partial<{ id: string; status: string; output: string | null; durationMs: number | null; tokensUsed: number | null }> = {}) {
  return { id: 'run1', status: 'completed', output: 'final', durationMs: 1500, tokensUsed: 42, ...over }
}
function teamLike(webhooks: any[]) {
  return { id: 'team1', name: 'Meu Time', config: { outputWebhooks: webhooks } }
}

function testBuildArgsDispatches() {
  const plan = buildTeamDispatchArgs(runLike(), teamLike([{ type: 'webhook', url: 'https://h/x', enabled: true }]))
  assert.equal(plan.dispatch, true, 'completed + enabled => dispatch')
  if (plan.dispatch) {
    assert.equal(plan.entity.id, 'team1')
    assert.equal(plan.entity.name, 'Meu Time')
    assert.equal(plan.execution.id, 'run1')
    assert.equal(plan.execution.durationMs, 1500)
    assert.equal(plan.execution.tokensUsed, 42)
    assert.equal(plan.finalOutput, 'final')
    assert.equal(plan.opts.event, 'team.completed')
    assert.equal(plan.opts.completedLabel, 'Time concluído')
  }
  console.log('✓ buildTeamDispatchArgs maps args on success')
}

function testBuildArgsGates() {
  for (const status of ['failed', 'cancelled', 'rate_limited', 'running', 'pending']) {
    assert.equal(buildTeamDispatchArgs(runLike({ status }), teamLike([{ type: 'webhook', url: 'https://h', enabled: true }])).dispatch, false, `status ${status} => no dispatch`)
  }
  assert.equal(buildTeamDispatchArgs(runLike(), teamLike([])).dispatch, false, 'no webhooks => no dispatch')
  assert.equal(buildTeamDispatchArgs(runLike(), teamLike([{ type: 'webhook', url: 'https://h', enabled: false }])).dispatch, false, 'all disabled => no dispatch')
  console.log('✓ buildTeamDispatchArgs gates (status/empty/disabled)')
}

function testBuildArgsNullMetrics() {
  const plan = buildTeamDispatchArgs(runLike({ durationMs: null, tokensUsed: null, output: null }), teamLike([{ type: 'slack', webhookUrl: 'https://s', enabled: true }]))
  assert.equal(plan.dispatch, true)
  if (plan.dispatch) {
    assert.equal(plan.execution.durationMs, 0, 'null durationMs -> 0')
    assert.equal(plan.execution.tokensUsed, 0, 'null tokensUsed -> 0')
    assert.equal(plan.finalOutput, null)
  }
  console.log('✓ buildTeamDispatchArgs null metrics default to 0')
}

async function main() {
  await testWebhookHmacAndDefaultEvent()
  await testWebhookTeamEvent()
  await testOnlyEnabledDispatched()
  await testSlackLabel()
  await testSlackDefaultLabel()
  await testEmailLabel()
  testBuildArgsDispatches()
  testBuildArgsGates()
  testBuildArgsNullMetrics()
  console.log('\nALL SP2 CHECKS PASSED')
}

main().catch((e) => { console.error('SP2 VERIFY FAILED:', e); process.exit(1) })
