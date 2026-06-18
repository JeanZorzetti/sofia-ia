// scripts/v2s6-verify.ts — Teams V2, S3.1: per-run git delivery mode (PR vs direct).
// Asserts the pure helper `git-delivery-plan.ts` (no jest, no sandbox/git/prisma).
// The worker (impure: sandbox/git/prisma) and repo-lifecycle stay OUT of the verify;
// the real git E2E is manual (against JeanZorzetti/repo-de-teste).
// Run: npx tsx scripts/v2s6-verify.ts
import assert from 'node:assert/strict'
import { planGitDelivery } from '../src/lib/git/git-delivery-plan'

let passed = 0
function ok(label: string, condition: boolean) {
  assert.ok(condition, `FAIL: ${label}`)
  console.log(`  ✓ ${label}`)
  passed++
}

const RUN_ID = 'abc-123'
const BASE = 'main'

// ── (a) 'pr' is byte-identical to the legacy flow ──────────────────────────
console.log("(a) 'pr' → working branch polaris/run-<id> + open PR (legacy)")
{
  const plan = planGitDelivery('pr', { runId: RUN_ID, base: BASE })
  ok("branch === `polaris/run-abc-123`", plan.branch === `polaris/run-${RUN_ID}`)
  ok('openPr === true', plan.openPr === true)
}

// ── (b) null / undefined / absent default to the legacy 'pr' plan ──────────
console.log("(b) null / undefined → legacy 'pr' (default preserves legado)")
{
  const fromNull = planGitDelivery(null, { runId: RUN_ID, base: BASE })
  const fromUndef = planGitDelivery(undefined, { runId: RUN_ID, base: BASE })
  ok('null → branch polaris/run-<id>', fromNull.branch === `polaris/run-${RUN_ID}`)
  ok('null → openPr true', fromNull.openPr === true)
  ok('undefined → branch polaris/run-<id>', fromUndef.branch === `polaris/run-${RUN_ID}`)
  ok('undefined → openPr true', fromUndef.openPr === true)
}

// ── (c) 'direct' → branch is the base itself, no PR ────────────────────────
console.log("(c) 'direct' → branch === base, openPr false")
{
  const plan = planGitDelivery('direct', { runId: RUN_ID, base: BASE })
  ok('branch === base (main)', plan.branch === BASE)
  ok('openPr === false', plan.openPr === false)
  // Works for any base, not just 'main'.
  const onMaster = planGitDelivery('direct', { runId: RUN_ID, base: 'master' })
  ok("direct on 'master' → branch master, no PR", onMaster.branch === 'master' && onMaster.openPr === false)
}

// ── (d) robustness: malformed value falls back to 'pr' without crashing ────
console.log("(d) robustness: junk value → legacy 'pr' (no crash)")
{
  const junk = planGitDelivery('xpto', { runId: RUN_ID, base: BASE })
  ok("'xpto' → branch polaris/run-<id>", junk.branch === `polaris/run-${RUN_ID}`)
  ok("'xpto' → openPr true", junk.openPr === true)
  // 'PR' (wrong case) is NOT 'direct' → legacy.
  const wrongCase = planGitDelivery('PR', { runId: RUN_ID, base: BASE })
  ok("'PR' (wrong case) → legacy openPr true", wrongCase.openPr === true)
  // Empty string → legacy.
  const empty = planGitDelivery('', { runId: RUN_ID, base: BASE })
  ok("'' → legacy openPr true", empty.openPr === true)
}

console.log(`\n✅ v2s6 verify: ${passed} assertions passed`)
