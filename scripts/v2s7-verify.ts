// scripts/v2s7-verify.ts — Teams V2, S3.2: PR vs direct toggle in the run composer UI.
// The UI itself isn't script-testable, so we assert the PURE helper `run-request.ts`
// (buildRunRequest) that the composer uses to build the POST body — no jest, no React,
// no DOM. The real E2E (click both modes against JeanZorzetti/repo-de-teste) is manual.
// Run: npx tsx scripts/v2s7-verify.ts
import assert from 'node:assert/strict'
import { buildRunRequest } from '../src/app/dashboard/teams/[id]/run-request'

let passed = 0
function ok(label: string, condition: boolean) {
  assert.ok(condition, `FAIL: ${label}`)
  console.log(`  ✓ ${label}`)
  passed++
}

const MISSION = 'ship the feature'

// ── (a) chat-run is byte-identical to the legacy { mission, mode } payload ──
console.log("(a) chat-run → { mission, mode } only, NO gitMode key (byte-identical legado)")
{
  const body = buildRunRequest({ mission: MISSION, mode: 'chat', gitMode: 'pr' })
  ok('mission preserved', body.mission === MISSION)
  ok("mode === 'chat'", body.mode === 'chat')
  ok("no 'gitMode' key at all", !('gitMode' in body))
  // JSON.stringify (what actually goes on the wire) carries exactly two keys.
  ok('serialized payload === legacy', JSON.stringify(body) === JSON.stringify({ mission: MISSION, mode: 'chat' }))
}

// ── (b) chat-run ignores gitMode even when set to 'direct' (inert in chat) ──
console.log("(b) chat-run ignores gitMode:'direct' (inert outside code-run)")
{
  const body = buildRunRequest({ mission: MISSION, mode: 'chat', gitMode: 'direct' })
  ok("still no 'gitMode' key", !('gitMode' in body))
  ok('serialized still byte-identical', JSON.stringify(body) === JSON.stringify({ mission: MISSION, mode: 'chat' }))
}

// ── (c) code-run + 'pr' → body carries gitMode:'pr' ─────────────────────────
console.log("(c) code-run + 'pr' → body includes gitMode:'pr'")
{
  const body = buildRunRequest({ mission: MISSION, mode: 'code', gitMode: 'pr' })
  ok("mode === 'code'", body.mode === 'code')
  ok("gitMode === 'pr'", body.gitMode === 'pr')
  ok('mission preserved', body.mission === MISSION)
}

// ── (d) code-run + 'direct' → body carries gitMode:'direct' ─────────────────
console.log("(d) code-run + 'direct' → body includes gitMode:'direct'")
{
  const body = buildRunRequest({ mission: MISSION, mode: 'code', gitMode: 'direct' })
  ok("gitMode === 'direct'", body.gitMode === 'direct')
  // The server's planGitDelivery turns this into branch=base + openPr:false (S3.1).
  ok("mode still 'code'", body.mode === 'code')
}

console.log(`\n✅ v2s7 verify: ${passed} assertions passed`)
