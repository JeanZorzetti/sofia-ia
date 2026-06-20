// scripts/preview-verify.ts — Preview mode (Lovable-style) for Teams code-runs.
// The worker/iframe/lifecycle aren't script-testable, so we assert the PURE pieces:
//   - detectPreviewPlan  (Next/Vite/dev-script → dev server; index.html → static; fallback)
//   - deriveProjectDir   (subdir of the site from the run's changed files, e.g. 'teste 2')
//   - readPreviewOverride (defensive Team.config.preview parsing)
//   - buildRunRequest    (previewEnabled appended only for code-runs, opt-in)
//   - shouldKeepPolling  (panel keeps polling through null→starting→live)
// No jest, no React, no DOM, no sandbox/e2b chain. Real E2E is manual in prod.
// Run: npx tsx scripts/preview-verify.ts
import assert from 'node:assert/strict'
import {
  detectPreviewPlan, deriveProjectDir, readPreviewOverride,
  PREVIEW_TTL_MS, PREVIEW_SANDBOX_MARGIN_MS,
} from '../src/lib/orchestration/team/preview-server'
import { buildRunRequest } from '../src/app/dashboard/teams/[id]/run-request'
import { shouldKeepPolling } from '../src/app/dashboard/teams/[id]/preview-poll'

let passed = 0
function ok(label: string, condition: boolean) {
  assert.ok(condition, `FAIL: ${label}`)
  console.log(`  ✓ ${label}`)
  passed++
}

const NEXT_PKG = JSON.stringify({ dependencies: { next: '16.1.6', react: '19' }, scripts: { dev: 'next dev' } })
const VITE_PKG = JSON.stringify({ devDependencies: { vite: '5.0.0' }, scripts: { dev: 'vite' } })
const DEV_SCRIPT_PKG = JSON.stringify({ dependencies: { astro: '4' }, scripts: { dev: 'astro dev' } })
const NO_DEV_PKG = JSON.stringify({ dependencies: { lodash: '4' }, scripts: { build: 'tsc' } })

// ── (a) Next.js → dev server ────────────────────────────────────────────────
console.log('(a) detectPreviewPlan → Next.js: kind dev, port 3000, -p/-H, {PORT} substituted')
{
  const p = detectPreviewPlan(NEXT_PKG, false)
  ok("kind === 'dev'", p.kind === 'dev')
  ok('port === 3000', p.port === 3000)
  ok('command targets port 3000', !!p.devCommand?.includes('-p 3000'))
  ok('binds 0.0.0.0', !!p.devCommand?.includes('-H 0.0.0.0'))
  ok('no literal {PORT} left', !p.devCommand?.includes('{PORT}'))
  ok('install is npm install', p.installCommand === 'npm install')
}

// ── (b) Vite → dev server ───────────────────────────────────────────────────
console.log('(b) detectPreviewPlan → Vite: kind dev, port 5173, --port/--host')
{
  const p = detectPreviewPlan(VITE_PKG, false)
  ok("kind === 'dev'", p.kind === 'dev')
  ok('port === 5173', p.port === 5173)
  ok('command targets --port 5173', !!p.devCommand?.includes('--port 5173'))
  ok('binds --host 0.0.0.0', !!p.devCommand?.includes('--host 0.0.0.0'))
}

// ── (c) generic dev script → npm run dev ────────────────────────────────────
console.log('(c) detectPreviewPlan → has `dev` script (no next/vite): npm run dev :3000')
{
  const p = detectPreviewPlan(DEV_SCRIPT_PKG, false)
  ok("kind === 'dev'", p.kind === 'dev')
  ok("command 'npm run dev'", p.devCommand === 'npm run dev')
  ok('port 3000', p.port === 3000)
}

// ── (d) plain HTML → static server (THE BUG: index.html, no dev script) ──────
console.log('(d) detectPreviewPlan → static when index.html present and no dev server')
{
  const noPkg = detectPreviewPlan(null, true)
  ok("kind === 'static' (no package.json + index.html)", noPkg.kind === 'static')
  ok('static port 3000', noPkg.port === 3000)
  ok('static has no devCommand', noPkg.devCommand === undefined)
  const pkgNoDev = detectPreviewPlan(NO_DEV_PKG, true)
  ok("kind === 'static' (package.json w/o dev script + index.html)", pkgNoDev.kind === 'static')
}

// ── (e) nothing detected → last-resort dev (fails clearly, caller records why) ──
console.log('(e) detectPreviewPlan → fallback dev when neither dev server nor index.html')
{
  const p = detectPreviewPlan(null, false)
  ok("kind === 'dev' fallback", p.kind === 'dev')
  ok("command 'npm run dev'", p.devCommand === 'npm run dev')
}

// ── (f) overrides ───────────────────────────────────────────────────────────
console.log('(f) detectPreviewPlan honors overrides (command/port/installCommand)')
{
  const p = detectPreviewPlan(NEXT_PKG, false, { port: 4321, command: 'pnpm dev --port {PORT}', installCommand: 'pnpm i' })
  ok('override forces dev', p.kind === 'dev')
  ok('override port', p.port === 4321)
  ok('override command with {PORT} substituted', p.devCommand === 'pnpm dev --port 4321')
  ok('override install', p.installCommand === 'pnpm i')
  const pp = detectPreviewPlan(NEXT_PKG, false, { port: 8080 })
  ok('port-only override re-targets base command', !!pp.devCommand?.includes('-p 8080') && !pp.devCommand?.includes('3000'))
}

// ── (g) deriveProjectDir: the site lives in a subdir ────────────────────────
console.log('(g) deriveProjectDir → common parent of changed files')
{
  ok("subdir with space → 'teste 2'", deriveProjectDir([
    { path: 'teste 2/index.html' }, { path: 'teste 2/script.js' }, { path: 'teste 2/styles.css' },
  ]) === 'teste 2')
  ok('root files → ""', deriveProjectDir([{ path: 'index.html' }, { path: 'styles.css' }]) === '')
  ok('nested common prefix', deriveProjectDir([{ path: 'app/site/a.tsx' }, { path: 'app/site/b.tsx' }]) === 'app/site')
  ok('divergent → common ancestor', deriveProjectDir([{ path: 'a/x.js' }, { path: 'b/y.js' }]) === '')
  ok('empty → ""', deriveProjectDir([]) === '')
  ok('null → ""', deriveProjectDir(null) === '')
}

// ── (h) readPreviewOverride: defensive parsing ──────────────────────────────
console.log('(h) readPreviewOverride is defensive (only valid fields survive)')
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

// ── (i) constants ───────────────────────────────────────────────────────────
console.log('(i) TTL constants are sane (15min + margin)')
{
  ok('TTL is 15 min', PREVIEW_TTL_MS === 15 * 60_000)
  ok('sandbox margin > 0', PREVIEW_SANDBOX_MARGIN_MS > 0)
}

// ── (j) buildRunRequest: previewEnabled is opt-in & code-run only ───────────
console.log('(j) buildRunRequest appends previewEnabled ONLY for code-runs with it ON')
{
  const chat = buildRunRequest({ mission: 'm', mode: 'chat', gitMode: 'pr', previewEnabled: true })
  ok('chat-run drops previewEnabled', !('previewEnabled' in chat))
  ok('chat-run byte-identical', JSON.stringify(chat) === JSON.stringify({ mission: 'm', mode: 'chat' }))
  const codeOff = buildRunRequest({ mission: 'm', mode: 'code', gitMode: 'pr', previewEnabled: false })
  ok('code-run preview-off drops key', !('previewEnabled' in codeOff))
  const codeOn = buildRunRequest({ mission: 'm', mode: 'code', gitMode: 'pr', previewEnabled: true })
  ok('code-run preview-on sets true', codeOn.previewEnabled === true)
  ok('still carries gitMode', codeOn.gitMode === 'pr')
}

// ── (k) shouldKeepPolling: the bug that left the panel empty ────────────────
console.log('(k) shouldKeepPolling keeps polling through the null→starting→live window')
{
  ok('null preview + running run → keep', shouldKeepPolling({ runStatus: 'running', previewStatus: null }))
  ok('null preview + COMPLETED run → keep (preview imminent — THE BUG)', shouldKeepPolling({ runStatus: 'completed', previewStatus: null }))
  ok("'starting' → keep", shouldKeepPolling({ runStatus: 'completed', previewStatus: 'starting' }))
  ok("'live' → keep", shouldKeepPolling({ runStatus: 'completed', previewStatus: 'live' }))
  ok("'failed' preview → stop", !shouldKeepPolling({ runStatus: 'completed', previewStatus: 'failed' }))
  ok("'stopped' → stop", !shouldKeepPolling({ runStatus: 'completed', previewStatus: 'stopped' }))
  ok("'expired' → stop", !shouldKeepPolling({ runStatus: 'completed', previewStatus: 'expired' }))
  ok('null preview + FAILED run → stop', !shouldKeepPolling({ runStatus: 'failed', previewStatus: null }))
  ok('null preview + cancelled run → stop', !shouldKeepPolling({ runStatus: 'cancelled', previewStatus: null }))
}

console.log(`\n✅ preview verify: ${passed} assertions passed`)
