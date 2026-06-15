# SP2 — Output webhooks → Teams — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a Team run finishes with `status === 'completed'`, fire the same outputs the old Orchestration engine fired (HMAC-signed webhook, Resend email, Slack incoming webhook), configured per team room.

**Architecture:** Reuse the already-generic `dispatchOutputWebhooks()` (generalize its copy/event for "Team", fix the broken HMAC header). Fire it from the **callers** after `runTeam` resolves (run route for chat-runs, worker for code-runs) — the coordinator (`runTeam`) stays INTACT. Config lives in `Team.config.outputWebhooks`; dispatch records persist in a new `TeamRun.outputDispatches` Json field (synced on deploy via `prisma db push`, no manual migration). Pure decision logic (`buildTeamDispatchArgs`) is unit-tested via a tsx script; DB/UI boundaries via `tsc` + manual E2E.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Prisma 5 + PostgreSQL, BullMQ worker, React client components. Spec: `docs/superpowers/specs/2026-06-15-sp2-output-webhooks-teams-design.md`.

---

## Environment constraints (read first — this machine)

- Project lives on **OneDrive**, which corrupts `node_modules`. **DO NOT run** `npm install`, `prisma generate`, `jest`, or `next build` locally — they hang.
- **Only reliable local checks:**
  - `npx tsc --noEmit` — type check (read-only). Tolerated pre-existing errors: missing optional deps (`bullmq`, `e2b`, `@xterm/*`, `diff2html`) and, after Task 2, a **stale-Prisma-client error on `outputDispatches`** (the local client is not regenerated; the field exists after the EasyPanel build runs `db push` + `prisma generate`). Only fix NEW errors in files you touched.
  - `npx tsx scripts/sp2-verify.ts` — runs the pure-logic assertions.
- **Real gate = EasyPanel deploy** (Linux, clean install). Deploy = **push to `main`** → auto-redeploys **app + worker** (2 services).
- **Commit only the slice's files** (the working tree has unrelated changes — logos/docs — that must NOT enter commits). Paths containing `[id]` need a literal pathspec: `git add ':(literal)src/app/api/teams/[id]/route.ts'`.
- Multi-line commit messages: use a heredoc in the Bash tool. End every commit message with the `Co-Authored-By` trailer.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/lib/orchestration/output-webhooks.ts` | Generic dispatcher (webhook/email/slack). Add `opts` (completedLabel/event), fix HMAC header, neutral payload, rename type. | Modify |
| `src/lib/orchestration/team/team-outputs.ts` | `buildTeamDispatchArgs` (PURE) + `dispatchTeamOutputs` (DB border, lazy prisma). | Create |
| `prisma/schema.prisma` | `TeamRun.outputDispatches Json?`. | Modify |
| `src/app/api/teams/[id]/run/route.ts` | Call `dispatchTeamOutputs` in `after()` after `runTeam` (chat-runs). | Modify |
| `src/worker/index.ts` | Call `dispatchTeamOutputs` after the run path (code-runs). | Modify |
| `src/app/api/teams/[id]/route.ts` | PATCH: shallow-merge `config` instead of replacing. | Modify |
| `src/app/dashboard/teams/[id]/TeamOutputsPanel.tsx` | Room UI: CRUD/toggle the 3 output types + show last-run delivery status. | Create |
| `src/app/dashboard/teams/[id]/TeamRunView.tsx` | Render the panel; surface `outputDispatches`. | Modify |
| `scripts/sp2-verify.ts` | tsx + `node:assert` verification (fake `fetch`, relative imports). | Create |

---

## Task 1: Generalize `output-webhooks.ts` (opts + HMAC header fix) + verify

**Files:**
- Modify: `src/lib/orchestration/output-webhooks.ts`
- Create: `scripts/sp2-verify.ts`

- [ ] **Step 1: Write the failing test (`scripts/sp2-verify.ts`)**

Create `scripts/sp2-verify.ts`:

```ts
// scripts/sp2-verify.ts — SP2 pure-logic verification (tsx, node:assert, fake fetch).
// Run: npx tsx scripts/sp2-verify.ts
import assert from 'node:assert'
import { createHmac } from 'node:crypto'
import { dispatchOutputWebhooks } from '../src/lib/orchestration/output-webhooks'

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

async function main() {
  await testWebhookHmacAndDefaultEvent()
  await testWebhookTeamEvent()
  await testOnlyEnabledDispatched()
  await testSlackLabel()
  await testSlackDefaultLabel()
  await testEmailLabel()
  console.log('\nALL SP2 CHECKS PASSED')
}

main().catch((e) => { console.error('SP2 VERIFY FAILED:', e); process.exit(1) })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx scripts/sp2-verify.ts`
Expected: FAIL — `X-Polaris-Signature header present` assertion throws (current header is `X-Polaris IA-Signature`), and/or `opts` is ignored so `team.completed`/`Time concluído` assertions fail.

- [ ] **Step 3: Modify `src/lib/orchestration/output-webhooks.ts`**

3a. Update the file's top docstring: change `X-Polaris IA-Signature` to `X-Polaris-Signature` (line ~5).

3b. Replace the types block (lines ~31-40) — rename `OrchestrationSummary` → `EntitySummary` and add `DispatchOpts`:

```ts
export interface EntitySummary {
  id: string
  name: string
}

export interface ExecutionSummary {
  id: string
  durationMs: number
  tokensUsed: number
}

export interface DispatchOpts {
  /** Full completion phrase used in email/slack (avoids gender agreement issues,
   *  e.g. 'Time concluído' vs 'Orquestração concluída'). Default below. */
  completedLabel?: string
  /** Webhook payload event name. Default 'orchestration.completed'. */
  event?: string
}
```

3c. `dispatchWebhook` — change signature to accept `entity`/`opts`, emit a neutral payload, fix the header:

```ts
async function dispatchWebhook(
  cfg: Extract<OutputWebhookConfig, { type: 'webhook' }>,
  entity: EntitySummary,
  execution: ExecutionSummary,
  finalOutput: any,
  opts: DispatchOpts,
): Promise<void> {
  const payload = {
    event: opts.event ?? 'orchestration.completed',
    id: entity.id,
    name: entity.name,
    executionId: execution.id,
    durationMs: execution.durationMs,
    tokensUsed: execution.tokensUsed,
    output: finalOutput,
    timestamp: new Date().toISOString(),
  }

  const body = JSON.stringify(payload)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  const signingSecret = cfg.secret || process.env.WEBHOOK_SIGNING_SECRET
  if (signingSecret) {
    const hmac = createHmac('sha256', signingSecret)
    hmac.update(body)
    const digest = hmac.digest('hex')
    headers['X-Polaris-Signature'] = `sha256=${digest}`
  }

  const res = await fetch(cfg.url, { method: 'POST', headers, body, signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`Webhook POST to ${cfg.url} returned HTTP ${res.status}`)
}
```

3d. `dispatchSlack` — accept `entity`/`opts`, use `completedLabel`:

```ts
async function dispatchSlack(
  cfg: Extract<OutputWebhookConfig, { type: 'slack' }>,
  entity: EntitySummary,
  execution: ExecutionSummary,
  finalOutput: any,
  opts: DispatchOpts,
): Promise<void> {
  const label = opts.completedLabel ?? 'Orquestração concluída'
  const outputText = buildOutputText(finalOutput)
  const durationSec = (execution.durationMs / 1000).toFixed(1)

  const body = {
    text: `✅ *${label}:* ${entity.name}`,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `✅ *${label}:* ${entity.name}\n⏱ Duração: ${durationSec}s | 🔤 Tokens: ${execution.tokensUsed}` } },
      { type: 'section', text: { type: 'mrkdwn', text: `*Resultado:*\n${outputText}` } },
    ],
  }

  const res = await fetch(cfg.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`Slack webhook returned HTTP ${res.status}`)
}
```

3e. `dispatchEmail` — accept `entity`/`opts`, use `completedLabel`:

```ts
async function dispatchEmail(
  cfg: Extract<OutputWebhookConfig, { type: 'email' }>,
  entity: EntitySummary,
  execution: ExecutionSummary,
  finalOutput: any,
  opts: DispatchOpts,
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) { console.warn('[OutputWebhooks] RESEND_API_KEY not set — skipping email dispatch'); return }

  const label = opts.completedLabel ?? 'Orquestração concluída'
  const outputText = buildOutputText(finalOutput)
  const durationSec = (execution.durationMs / 1000).toFixed(1)
  const subject = cfg.subject || `${label}: ${entity.name}`

  const html = `
    <h2>✅ ${label}</h2>
    <p><strong>Nome:</strong> ${entity.name}</p>
    <p><strong>Duração:</strong> ${durationSec}s</p>
    <p><strong>Tokens utilizados:</strong> ${execution.tokensUsed}</p>
    <h3>Resultado:</h3>
    <pre style="background:#f4f4f4;padding:12px;border-radius:6px;white-space:pre-wrap">${outputText}</pre>
    <hr/>
    <small>Enviado por <a href="https://polarisia.com.br">Polaris IA</a></small>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Polaris IA <noreply@polarisia.com.br>', to: [cfg.to], subject, html }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) { const text = await res.text().catch(() => ''); throw new Error(`Resend email returned HTTP ${res.status}: ${text}`) }
}
```

3f. `dispatchOutputWebhooks` — add `opts` param and thread it into each dispatcher. Replace the signature and the three call sites inside the `enabled.map(...)`:

```ts
export async function dispatchOutputWebhooks(
  entity: EntitySummary & { config: any },
  execution: ExecutionSummary,
  finalOutput: any,
  opts: DispatchOpts = {},
): Promise<DispatchRecord[]> {
  const config = entity.config as Record<string, any> | null
  const outputWebhooks: OutputWebhookConfig[] = config?.outputWebhooks ?? []
  if (!outputWebhooks.length) return []
  const enabled = outputWebhooks.filter((w) => w.enabled)
  if (!enabled.length) return []

  console.log(`[OutputWebhooks] Dispatching ${enabled.length} output(s) for ${entity.id}`)

  const results = await Promise.allSettled(
    enabled.map(async (cfg): Promise<DispatchRecord> => {
      const sentAt = new Date().toISOString()
      const destination =
        cfg.type === 'email' ? (cfg.to ?? '') :
        cfg.type === 'slack' ? 'slack-webhook' :
        (cfg.url ?? '')
      try {
        if (cfg.type === 'webhook') { await dispatchWebhook(cfg, entity, execution, finalOutput, opts) }
        else if (cfg.type === 'slack') { await dispatchSlack(cfg, entity, execution, finalOutput, opts) }
        else if (cfg.type === 'email') { await dispatchEmail(cfg, entity, execution, finalOutput, opts) }
        return { type: cfg.type, destination, status: 'sent', sentAt }
      } catch (err: any) {
        console.error(`[OutputWebhooks] Failed to dispatch ${cfg.type}:`, err)
        return { type: cfg.type, destination, status: 'failed', error: err?.message ?? 'Unknown error', sentAt }
      }
    })
  )

  return results.map((r) => (r.status === 'fulfilled' ? r.value : { type: 'unknown', destination: '', status: 'failed' as const, error: 'Promise rejected', sentAt: new Date().toISOString() }))
}
```

> The orchestration caller (`src/app/api/orchestrations/[id]/execute/route.ts:734`) passes `{id,name,config}` + no `opts` → defaults preserve its behavior exactly (except the corrected header name, which is intentional and safe — no real receivers in prod).

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx scripts/sp2-verify.ts`
Expected: PASS — prints the 6 `✓` lines and `ALL SP2 CHECKS PASSED`.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no NEW errors in `output-webhooks.ts` (tolerated pre-existing errors from missing optional deps may appear elsewhere).

- [ ] **Step 6: Commit**

```bash
git add src/lib/orchestration/output-webhooks.ts scripts/sp2-verify.ts
git commit -m "$(cat <<'EOF'
feat(sp2): generalize output-webhooks (opts) + fix HMAC header

Add optional DispatchOpts (completedLabel/event) to dispatchOutputWebhooks
so Teams can pass "Time concluído"/team.completed; defaults preserve the
orchestration copy/event. Neutral webhook payload. Fix the broken HMAC
header X-Polaris IA-Signature -> X-Polaris-Signature. Rename
OrchestrationSummary -> EntitySummary. Add scripts/sp2-verify.ts.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add `TeamRun.outputDispatches` to the schema

**Files:**
- Modify: `prisma/schema.prisma` (model `TeamRun`, near the existing `changedFiles` field, ~line 1368)

- [ ] **Step 1: Add the field**

In `model TeamRun`, after the `changedFiles  Json?  @map("changed_files")` line, add:

```prisma
  outputDispatches Json? @map("output_dispatches") // SP2: [{type,destination,status,error?,sentAt}]
```

- [ ] **Step 2: Type-check (informational)**

Run: `npx tsc --noEmit`
Expected: still passes for schema files. The local Prisma client is NOT regenerated (OneDrive) so code referencing `outputDispatches` in Task 3+ will show a tolerated stale-client error locally; it resolves on the EasyPanel build (`db push` adds the column, `prisma generate` adds the field).

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "$(cat <<'EOF'
feat(sp2): add TeamRun.outputDispatches (Json) for delivery records

Applied on deploy via `prisma db push` (Dockerfile CMD) — no manual migration.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Create `team-outputs.ts` (pure + border) + extend verify

**Files:**
- Create: `src/lib/orchestration/team/team-outputs.ts`
- Modify: `scripts/sp2-verify.ts`

- [ ] **Step 1: Write the failing tests (extend `scripts/sp2-verify.ts`)**

Add this import at the top of `scripts/sp2-verify.ts` (with the other imports):

```ts
import { buildTeamDispatchArgs } from '../src/lib/orchestration/team/team-outputs'
```

Add these test functions before `main()`:

```ts
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
```

Add their calls inside `main()` (before the final `console.log`):

```ts
  testBuildArgsDispatches()
  testBuildArgsGates()
  testBuildArgsNullMetrics()
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx scripts/sp2-verify.ts`
Expected: FAIL — cannot resolve `buildTeamDispatchArgs` from `team-outputs` (module/file does not exist yet).

- [ ] **Step 3: Create `src/lib/orchestration/team/team-outputs.ts`**

```ts
// src/lib/orchestration/team/team-outputs.ts
// SP2 — fire output webhooks/email/slack when a Team run completes successfully.
// Coordinator (runTeam) stays INTACT: this is called from the CALLERS (run route
// + worker) AFTER runTeam resolves. Reuses the generic dispatchOutputWebhooks.
//
// prisma is imported LAZILY (inside dispatchTeamOutputs) so the PURE
// buildTeamDispatchArgs can be unit-tested under tsx without loading the Prisma
// client (which instantiates at module load and breaks on this machine's OneDrive
// node_modules). The `Prisma` type is import-type-only (erased at runtime).
import type { Prisma } from '@prisma/client'
import { dispatchOutputWebhooks, type DispatchOpts, type OutputWebhookConfig } from '../output-webhooks'

const TEAM_OPTS: DispatchOpts = { completedLabel: 'Time concluído', event: 'team.completed' }

export interface TeamRunLike {
  id: string
  status: string
  output: string | null
  durationMs: number | null
  tokensUsed: number | null
}
export interface TeamLike {
  id: string
  name: string
  config: unknown
}

export type TeamDispatchPlan =
  | { dispatch: false }
  | {
      dispatch: true
      entity: { id: string; name: string; config: unknown }
      execution: { id: string; durationMs: number; tokensUsed: number }
      finalOutput: unknown
      opts: DispatchOpts
    }

/** PURE — decide whether to dispatch and build the args. No DB, no network. */
export function buildTeamDispatchArgs(run: TeamRunLike, team: TeamLike): TeamDispatchPlan {
  if (run.status !== 'completed') return { dispatch: false }
  const config = (team.config && typeof team.config === 'object' ? team.config : {}) as Record<string, unknown>
  const webhooks = (config.outputWebhooks ?? []) as OutputWebhookConfig[]
  if (!Array.isArray(webhooks) || !webhooks.some((w) => w?.enabled)) return { dispatch: false }
  return {
    dispatch: true,
    entity: { id: team.id, name: team.name, config: team.config },
    execution: { id: run.id, durationMs: run.durationMs ?? 0, tokensUsed: run.tokensUsed ?? 0 },
    finalOutput: run.output,
    opts: TEAM_OPTS,
  }
}

/** BORDER — load run+team, dispatch, persist records. Best-effort, NEVER throws
 *  (the run already finished successfully; outputs are a side-effect). */
export async function dispatchTeamOutputs(runId: string): Promise<void> {
  try {
    const { prisma } = await import('@/lib/prisma')
    const run = await prisma.teamRun.findUnique({
      where: { id: runId },
      select: {
        id: true, status: true, output: true, durationMs: true, tokensUsed: true,
        team: { select: { id: true, name: true, config: true } },
      },
    })
    if (!run || !run.team) return
    const plan = buildTeamDispatchArgs(run, run.team)
    if (!plan.dispatch) return
    const records = await dispatchOutputWebhooks(
      { id: plan.entity.id, name: plan.entity.name, config: plan.entity.config },
      plan.execution,
      plan.finalOutput,
      plan.opts,
    )
    if (records.length > 0) {
      await prisma.teamRun
        .update({ where: { id: runId }, data: { outputDispatches: records as unknown as Prisma.InputJsonValue } as Prisma.TeamRunUpdateInput })
        .catch(() => {})
    }
  } catch (err) {
    console.error(`[TeamOutputs] dispatch failed for run ${runId}:`, err)
  }
}
```

> Note: the `as Prisma.TeamRunUpdateInput` cast keeps `tsc` green locally despite the stale client missing `outputDispatches`. After the EasyPanel build (`db push` + `prisma generate`) the field is real and the cast is harmless.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx scripts/sp2-verify.ts`
Expected: PASS — now prints the 3 new `✓ buildTeamDispatchArgs ...` lines plus the Task-1 lines, then `ALL SP2 CHECKS PASSED`.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: only the tolerated stale-client error on `outputDispatches` inside `team-outputs.ts` (resolves on deploy). No other new errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/orchestration/team/team-outputs.ts scripts/sp2-verify.ts
git commit -m "$(cat <<'EOF'
feat(sp2): team-outputs (buildTeamDispatchArgs + dispatchTeamOutputs)

Pure gate/mapping (completed-only, enabled-only) + DB border that loads the
run/team, reuses dispatchOutputWebhooks with team copy/event, and persists
DispatchRecord[] to TeamRun.outputDispatches. prisma is imported lazily so
the pure logic stays tsx-testable. Verify script extended.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Wire the callers (chat-runs + code-runs)

**Files:**
- Modify: `src/app/api/teams/[id]/run/route.ts` (inside the `after()` block, ~lines 68-81)
- Modify: `src/worker/index.ts` (job handler, ~lines 137-163; + import near the top)

- [ ] **Step 1: Chat-runs — call dispatch in `after()` after `runTeam`**

In `src/app/api/teams/[id]/run/route.ts`, inside the `after(async () => { try { ... } })`, immediately after the `await runTeam(run.id, { ... })` call and before the closing of the `try`, add:

```ts
          const { dispatchTeamOutputs } = await import('@/lib/orchestration/team/team-outputs')
          await dispatchTeamOutputs(run.id)
```

So the block reads:

```ts
      after(async () => {
        try {
          const { runTeam } = await import('@/lib/orchestration/team/team-coordinator')
          const { createPrismaTeamStore } = await import('@/lib/orchestration/team/team-store')
          const { chatWithAgent } = await import('@/lib/ai/groq')
          await runTeam(run.id, {
            store: createPrismaTeamStore(),
            chat: (agentId, messages, ctx, opts) => chatWithAgent(agentId, messages as never, ctx, opts),
          })
          const { dispatchTeamOutputs } = await import('@/lib/orchestration/team/team-outputs')
          await dispatchTeamOutputs(run.id)
        } catch (err) {
          console.error('[Teams] background run failed:', err)
        }
      })
```

- [ ] **Step 2: Code-runs — add the worker import**

In `src/worker/index.ts`, add to the imports near the top (after the existing `team-*` imports, ~line 19):

```ts
import { dispatchTeamOutputs } from '@/lib/orchestration/team/team-outputs'
```

- [ ] **Step 3: Code-runs — call dispatch after the run path (both repo + C0)**

In the `new Worker<CodeRunJob>(...)` job handler, after the `if (run?.repoUrl) { ... } else { ... }` block and BEFORE the `finally`, add the dispatch. This covers both code paths and is insensitive to the early `return`s inside `runWithRepo` (the gate inside `dispatchTeamOutputs` only fires on `status === 'completed'`):

```ts
    try {
      if (run?.repoUrl) {
        await runWithRepo(sandbox, runId, run.repoUrl, run.baseBranch)
      } else {
        await prisma.teamRun
          .update({ where: { id: runId }, data: { sandboxId: sandbox.id } })
          .catch(() => {})
        const store = createPrismaTeamStore()
        const codeChat = createCodeChatFn(sandbox, baseChat, { store, claudeToken: CLAUDE_OAUTH_TOKEN })
        await runTeam(runId, { store, chat: codeChat })
      }
      await dispatchTeamOutputs(runId)
    } finally {
      await sandbox.close().catch(() => {})
    }
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: only the tolerated errors (stale-client `outputDispatches`; worker's pre-existing `bullmq`/`e2b` missing-dep errors). No new errors in the two edited files.

- [ ] **Step 5: Commit**

```bash
git add ':(literal)src/app/api/teams/[id]/run/route.ts' src/worker/index.ts
git commit -m "$(cat <<'EOF'
feat(sp2): fire team output webhooks from the callers

Chat-runs: dispatchTeamOutputs in the run route after() once runTeam resolves.
Code-runs: dispatchTeamOutputs in the worker after the run/teardown path
(both repo and C0). Coordinator stays untouched.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Fix PATCH to shallow-merge `config`

**Files:**
- Modify: `src/app/api/teams/[id]/route.ts` (the `PATCH` handler + `ownTeam` usage, ~lines 7-9, 39, 65-73)

- [ ] **Step 1: Capture the current team (for its existing config)**

In `PATCH`, replace the ownership guard so it keeps the loaded record:

```ts
    const existing = await ownTeam(id, auth.id)
    if (!existing) return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
```

(`ownTeam` already returns the full team row via `findFirst`, so `existing.config` is available.)

- [ ] **Step 2: Shallow-merge config in the update**

Replace the `config` line in the `prisma.team.update({ data: { ... } })` (currently `...(config !== undefined ? { config: config as object } : {})`) with:

```ts
        ...(config !== undefined
          ? { config: { ...((existing.config && typeof existing.config === 'object' ? existing.config : {}) as Record<string, unknown>), ...config } }
          : {}),
```

> This preserves existing keys (`repoUrl`, `defaultBranch`, `maxTurns`, `retryCap`) when a partial config (e.g. just `{ outputWebhooks }`) is sent. Senders of a full config object are unaffected (full-over-full = same result).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors in `route.ts`.

- [ ] **Step 4: Commit**

```bash
git add ':(literal)src/app/api/teams/[id]/route.ts'
git commit -m "$(cat <<'EOF'
fix(sp2): PATCH /api/teams/[id] shallow-merges config

Previously replaced config wholesale, so saving outputWebhooks would wipe
repoUrl/defaultBranch/maxTurns/retryCap. Now merges over the current config.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Room UI — Outputs panel

**Files:**
- Create: `src/app/dashboard/teams/[id]/TeamOutputsPanel.tsx`
- Modify: `src/app/dashboard/teams/[id]/TeamRunView.tsx`

- [ ] **Step 1: Create `TeamOutputsPanel.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
// import type ONLY (erased at runtime) — must NOT bundle output-webhooks.ts (imports node:crypto)
import type { OutputWebhookConfig, DispatchRecord } from '@/lib/orchestration/output-webhooks'

type WebhookRow = Extract<OutputWebhookConfig, { type: 'webhook' }>
type EmailRow = Extract<OutputWebhookConfig, { type: 'email' }>
type SlackRow = Extract<OutputWebhookConfig, { type: 'slack' }>

const NEW_BY_TYPE: Record<OutputWebhookConfig['type'], OutputWebhookConfig> = {
  webhook: { type: 'webhook', url: '', enabled: true, secret: '' },
  email: { type: 'email', to: '', subject: '', enabled: true },
  slack: { type: 'slack', webhookUrl: '', enabled: true },
}

export function TeamOutputsPanel({
  teamId,
  initialWebhooks,
  latestDispatches,
}: {
  teamId: string
  initialWebhooks: OutputWebhookConfig[]
  latestDispatches?: DispatchRecord[] | null
}) {
  const [rows, setRows] = useState<OutputWebhookConfig[]>(initialWebhooks ?? [])
  const [saving, setSaving] = useState(false)

  function update(i: number, patch: Partial<OutputWebhookConfig>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? ({ ...r, ...patch } as OutputWebhookConfig) : r)))
  }
  function add(type: OutputWebhookConfig['type']) {
    setRows((prev) => [...prev, { ...NEW_BY_TYPE[type] }])
  }
  function remove(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { outputWebhooks: rows } }),
      })
      const j = await res.json()
      if (!j.success) throw new Error(j.error || 'Falha ao salvar')
      toast.success('Outputs salvos')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Outputs / Webhooks</h3>
        <div className="flex gap-2">
          <button onClick={() => add('webhook')} className="text-xs rounded border border-white/15 px-2 py-1 hover:bg-white/10">+ Webhook</button>
          <button onClick={() => add('email')} className="text-xs rounded border border-white/15 px-2 py-1 hover:bg-white/10">+ Email</button>
          <button onClick={() => add('slack')} className="text-xs rounded border border-white/15 px-2 py-1 hover:bg-white/10">+ Slack</button>
        </div>
      </div>

      {rows.length === 0 && <p className="text-xs text-white/50">Nenhum output configurado. Disparados quando um run termina com sucesso.</p>}

      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2 rounded border border-white/10 p-2">
          <input type="checkbox" checked={row.enabled} onChange={(e) => update(i, { enabled: e.target.checked })} title="Ativo" />
          <span className="text-xs uppercase text-white/60 w-16">{row.type}</span>
          {row.type === 'webhook' && (
            <>
              <input className="flex-1 bg-transparent border border-white/10 rounded px-2 py-1 text-xs" placeholder="https://..." value={(row as WebhookRow).url} onChange={(e) => update(i, { url: e.target.value })} />
              <input className="w-40 bg-transparent border border-white/10 rounded px-2 py-1 text-xs" placeholder="secret (opcional)" value={(row as WebhookRow).secret ?? ''} onChange={(e) => update(i, { secret: e.target.value })} />
            </>
          )}
          {row.type === 'email' && (
            <>
              <input className="flex-1 bg-transparent border border-white/10 rounded px-2 py-1 text-xs" placeholder="destino@email.com" value={(row as EmailRow).to} onChange={(e) => update(i, { to: e.target.value })} />
              <input className="w-48 bg-transparent border border-white/10 rounded px-2 py-1 text-xs" placeholder="assunto (opcional)" value={(row as EmailRow).subject ?? ''} onChange={(e) => update(i, { subject: e.target.value })} />
            </>
          )}
          {row.type === 'slack' && (
            <input className="flex-1 bg-transparent border border-white/10 rounded px-2 py-1 text-xs" placeholder="https://hooks.slack.com/services/..." value={(row as SlackRow).webhookUrl} onChange={(e) => update(i, { webhookUrl: e.target.value })} />
          )}
          <button onClick={() => remove(i)} className="text-xs text-red-400 hover:text-red-300 px-2">remover</button>
        </div>
      ))}

      <div className="flex items-center justify-between pt-1">
        <button onClick={save} disabled={saving} className="text-xs rounded bg-white/15 px-3 py-1.5 hover:bg-white/25 disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar outputs'}</button>
        {latestDispatches && latestDispatches.length > 0 && (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] uppercase text-white/40">Última entrega</span>
            {latestDispatches.map((d, i) => (
              <span key={i} className={`text-xs ${d.status === 'sent' ? 'text-emerald-400' : 'text-red-400'}`}>
                {d.status === 'sent' ? '✓' : '✗'} {d.type} {d.destination ? `→ ${d.destination}` : ''}{d.error ? ` (${d.error})` : ''}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Integrate into `TeamRunView.tsx`**

Read `src/app/dashboard/teams/[id]/TeamRunView.tsx`. Then:

(a) Add the import near the other imports:

```ts
import { TeamOutputsPanel } from './TeamOutputsPanel'
```

(b) The component already holds `team` (from `loadTeam()`) and `history` (recent runs from `team.runs`). Render the panel where team settings/config make sense (e.g., below the team header or in a config/settings area), passing the current webhooks and the latest run's dispatch records:

```tsx
{team && (
  <TeamOutputsPanel
    teamId={teamId}
    initialWebhooks={(((team.config as any)?.outputWebhooks) ?? []) as any}
    latestDispatches={(history?.[0] as any)?.outputDispatches ?? null}
  />
)}
```

> `team.config` and `history[0].outputDispatches` are loose-typed here because the local Prisma client is stale; the GET `/api/teams/[id]` already returns `config` and full `runs` rows (so `outputDispatches` flows through once the column exists). Place the block inside the existing JSX tree (not inside a conditional that hides it during a run).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors in `TeamOutputsPanel.tsx` / `TeamRunView.tsx` beyond tolerated stale-client casts (which are already `as any`).

- [ ] **Step 4: Commit**

```bash
git add ':(literal)src/app/dashboard/teams/[id]/TeamOutputsPanel.tsx' ':(literal)src/app/dashboard/teams/[id]/TeamRunView.tsx'
git commit -m "$(cat <<'EOF'
feat(sp2): team room Outputs panel (webhook/email/slack) + delivery status

CRUD/toggle the 3 output types stored in Team.config.outputWebhooks (saved via
PATCH, server-merged) and show the latest run's outputDispatches status.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Final verification, deploy, and E2E

- [ ] **Step 1: Full pure-logic verification**

Run: `npx tsx scripts/sp2-verify.ts`
Expected: PASS — all `✓` lines + `ALL SP2 CHECKS PASSED`.

- [ ] **Step 2: Final type-check**

Run: `npx tsc --noEmit`
Expected: only the documented tolerated errors (missing optional deps; stale-client `outputDispatches`). Nothing else new.

- [ ] **Step 3: Push to deploy (app + worker)**

```bash
git push origin main
```

> This redeploys both EasyPanel services. The app container's `db push` adds the `output_dispatches` column; `prisma generate` (build) makes the field real.

- [ ] **Step 4: Manual E2E with the user (authenticated — runs on the user's side)**

Provide this checklist to the user:
1. Create a test receiver at https://webhook.site (copy its unique URL).
2. In a team room (`/dashboard/teams/[id]`), open the **Outputs / Webhooks** panel → add a **Webhook**, paste the URL, set a `secret`, ensure **enabled**, **Salvar outputs**.
3. Run a **chat** mission and wait for it to complete.
4. Confirm webhook.site received a **POST** with header **`X-Polaris-Signature: sha256=...`** and JSON body `{ event: 'team.completed', id, name, output, ... }`.
5. (Optional) Verify the HMAC: `sha256=` + HMAC-SHA256(rawBody, secret) equals the header.
6. (Optional) Add an **email** (needs `RESEND_API_KEY` on the app service) and/or **Slack** (incoming webhook URL) and re-run.
7. Confirm the panel shows the **Última entrega** status (✓/✗) for the latest run.
8. (Optional) For a **code**-run with a repo, run a mission and confirm the webhook fires from the worker too.

- [ ] **Step 5: Update the project memory**

After E2E passes, update `~/.claude/.../memory/project_polaris_teams.md` (and `MEMORY.md` hook) noting SP2 delivered: output webhooks ported to Teams (callers fire `dispatchTeamOutputs`; `Team.config.outputWebhooks`; `TeamRun.outputDispatches`; PATCH now merges config; HMAC header normalized). Next: SP3 (Scheduling/cron).

---

## Self-Review (done by plan author)

- **Spec coverage:** generalize function ✅ (T1); fire from callers, coordinator intact ✅ (T4); config in `Team.config.outputWebhooks` + PATCH merge fix ✅ (T5); persist `TeamRun.outputDispatches` ✅ (T2+T3); UI 3 types + delivery status ✅ (T6); HMAC header fix ✅ (T1); verify script + tsc + E2E ✅ (T1/T3/T7). All spec sections mapped.
- **Placeholder scan:** no TBD/TODO; every code step shows full code; exact commands + expected output given.
- **Type consistency:** `DispatchOpts`/`EntitySummary` defined in T1 and used identically in T3/T6; `buildTeamDispatchArgs`/`TeamDispatchPlan` defined in T3 and consumed by the same names in the verify script and `dispatchTeamOutputs`; `OutputWebhookConfig`/`DispatchRecord` imported as types in T6 (no crypto bundling). `dispatchTeamOutputs` name consistent across T3/T4.
- **Known intentional deviation:** local `tsc` shows a stale-Prisma-client error on `outputDispatches` until deploy — documented as tolerated.
```
