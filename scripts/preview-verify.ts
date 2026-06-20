// scripts/preview-verify.ts — Preview mode (Lovable-style) for Teams code-runs.
// The worker/iframe/lifecycle aren't script-testable, so we assert the PURE pieces:
//   - detectPreviewConfig (next/vite/fallback + {PORT} substitution + overrides)
//   - readPreviewOverride (defensive Team.config.preview parsing)
//   - buildRunRequest (previewEnabled appended only for code-runs, opt-in)
// No jest, no React, no DOM, no sandbox/e2b chain. Real E2E (run a Next app with the
// Preview toggle on, watch the iframe go live, Estender/Parar/expirar) is manual in prod.
// Run: npx tsx scripts/preview-verify.ts
import assert from 'node:assert/strict'
import {
  detectPreviewConfig, readPreviewOverride, PREVIEW_TTL_MS, PREVIEW_SANDBOX_MARGIN_MS,
} from '../src/lib/orchestration/team/preview-server'
import { buildRunRequest } from '../src/app/dashboard/teams/[id]/run-request'

let passed = 0
function ok(label: string, condition: boolean) {
  assert.ok(condition, `FAIL: ${label}`)
  console.log(`  ✓ ${label}`)
  passed++
}

const NEXT_PKG = JSON.stringify({ dependencies: { next: '16.1.6', react: '19' } })
const VITE_PKG = JSON.stringify({ devDependencies: { vite: '5.0.0' } })
const PLAIN_PKG = JSON.stringify({ dependencies: { express: '4' } })

// ── (a) Next.js detection ───────────────────────────────────────────────────
console.log('(a) detectPreviewConfig → Next.js: port 3000, dev with -p/-H, {PORT} substituted')
{
  const c = detectPreviewConfig(NEXT_PKG)
  ok('port === 3000', c.port === 3000)
  ok('command targets port 3000', c.command.includes('-p 3000'))
  ok('binds 0.0.0.0', c.command.includes('-H 0.0.0.0'))
  ok('no literal {PORT} left', !c.command.includes('{PORT}'))
  ok('install is npm install', c.installCommand === 'npm install')
}

// ── (b) Vite detection ──────────────────────────────────────────────────────
console.log('(b) detectPreviewConfig → Vite: port 5173, --port/--host')
{
  const c = detectPreviewConfig(VITE_PKG)
  ok('port === 5173', c.port === 5173)
  ok('command targets --port 5173', c.command.includes('--port 5173'))
  ok('binds --host 0.0.0.0', c.command.includes('--host 0.0.0.0'))
}

// ── (c) fallback for unknown / unparseable ──────────────────────────────────
console.log('(c) detectPreviewConfig → fallback npm run dev :3000 for unknown/invalid pkg')
{
  const c1 = detectPreviewConfig(PLAIN_PKG)
  ok('fallback port 3000', c1.port === 3000)
  ok("fallback command 'npm run dev'", c1.command === 'npm run dev')
  const c2 = detectPreviewConfig('not json{{{')
  ok('invalid JSON → fallback 3000', c2.port === 3000)
  const c3 = detectPreviewConfig(null)
  ok('null pkg → fallback 3000', c3.port === 3000)
}

// ── (d) overrides: port substitution flows into the command ─────────────────
console.log('(d) detectPreviewConfig honors overrides (command/port/installCommand)')
{
  const c = detectPreviewConfig(NEXT_PKG, { port: 4321, command: 'pnpm dev --port {PORT}', installCommand: 'pnpm i' })
  ok('override port', c.port === 4321)
  ok('override command with {PORT} substituted', c.command === 'pnpm dev --port 4321')
  ok('override install', c.installCommand === 'pnpm i')
}
{
  // port-only override re-substitutes the BASE command's {PORT}
  const c = detectPreviewConfig(NEXT_PKG, { port: 8080 })
  ok('port-only override re-targets base command', c.command.includes('-p 8080') && !c.command.includes('3000'))
}

// ── (e) readPreviewOverride: defensive parsing of Team.config.preview ───────
console.log('(e) readPreviewOverride is defensive (only valid fields survive)')
{
  ok('null config → {}', Object.keys(readPreviewOverride(null)).length === 0)
  ok('no preview key → {}', Object.keys(readPreviewOverride({ repoUrl: 'x' })).length === 0)
  const o = readPreviewOverride({ preview: { command: ' vite ', port: 9000, installCommand: '', junk: 1 } })
  ok('command trimmed', o.command === 'vite')
  ok('numeric port kept', o.port === 9000)
  ok('empty installCommand dropped', !('installCommand' in o))
  const bad = readPreviewOverride({ preview: { port: 'NaN', command: 42 } })
  ok('non-string command dropped', !('command' in bad))
  ok('non-number port dropped', !('port' in bad))
}

// ── (f) constants sane ──────────────────────────────────────────────────────
console.log('(f) TTL constants are sane (15min + margin)')
{
  ok('TTL is 15 min', PREVIEW_TTL_MS === 15 * 60_000)
  ok('sandbox margin > 0 and ≥ TTL', PREVIEW_SANDBOX_MARGIN_MS > 0 && PREVIEW_TTL_MS + PREVIEW_SANDBOX_MARGIN_MS > PREVIEW_TTL_MS)
}

// ── (g) buildRunRequest: previewEnabled is opt-in & code-run only ───────────
console.log('(g) buildRunRequest appends previewEnabled ONLY for code-runs with it ON')
{
  // chat-run stays byte-identical to legacy (no previewEnabled / no gitMode)
  const chat = buildRunRequest({ mission: 'm', mode: 'chat', gitMode: 'pr', previewEnabled: true })
  ok('chat-run drops previewEnabled', !('previewEnabled' in chat))
  ok('chat-run byte-identical', JSON.stringify(chat) === JSON.stringify({ mission: 'm', mode: 'chat' }))

  // code-run with preview off → no key (byte-identical to pre-preview code payload)
  const codeOff = buildRunRequest({ mission: 'm', mode: 'code', gitMode: 'pr', previewEnabled: false })
  ok('code-run preview-off drops key', !('previewEnabled' in codeOff))

  // code-run with preview on → previewEnabled:true present
  const codeOn = buildRunRequest({ mission: 'm', mode: 'code', gitMode: 'pr', previewEnabled: true })
  ok('code-run preview-on sets true', codeOn.previewEnabled === true)
  ok('still carries gitMode', codeOn.gitMode === 'pr')
}

console.log(`\n✅ preview verify: ${passed} assertions passed`)
