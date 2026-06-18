// scripts/v2s3-verify.ts
// Local verification for Teams V2 — fatia S1.3 (UI + CRUD to persist per-member tool
// capabilities). The RosterEditor UI is validated by manual E2E (ROADMAP), but the PURE
// roster<->payload mapping was extracted into src/app/dashboard/teams/roster-mapping.ts so
// it can be asserted here via tsx — no jest (OneDrive errno -4094). Run:
//   npx tsx scripts/v2s3-verify.ts
//
// Required cases (from Sessão 3 / ROADMAP S1.3):
//   (a) member with tools + mcpAllowlist + toolSkills/filesystem → capabilities in payload.
//   (b) "inherit" member (no caps) → NO capabilities key (legacy preserved).
//   (c) tools:false serializes as { tools:false } (S1.2 gate hard-disables).
//   (d) connection→option mapping uses AgentMcpServer.id, NOT McpServer.id.
import assert from 'node:assert/strict'
import {
  INHERIT, rosterToMembers, mcpConnectionToOption,
  type RosterRow,
} from '../src/app/dashboard/teams/roster-mapping'
import type { CapabilityPolicy } from '../src/lib/orchestration/team/team-types'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

async function main() {
  // ── (a) full policy round-trips into the payload ──
  console.log('(a) member with tools + mcpAllowlist + flags → capabilities in payload')
  {
    const policy: CapabilityPolicy = {
      tools: true, mcpAllowlist: ['ams-db'], toolSkills: false, filesystem: true,
    }
    const rows: RosterRow[] = [
      { agentId: 'a-lead', role: 'lead', model: INHERIT, effort: INHERIT },
      { agentId: 'a-worker', role: 'worker', model: 'openai/gpt-4o', effort: 'high', caps: policy },
    ]
    const payload = rosterToMembers(rows)
    assert.deepEqual(payload[1].capabilities, policy)
    ok('worker capabilities = the exact policy (tools/mcpAllowlist/toolSkills/filesystem)')
    // the surrounding fields still map as before (no regression)
    assert.equal(payload[1].model, 'openai/gpt-4o')
    assert.equal(payload[1].effort, 'high')
    assert.equal(payload[1].position, 1)
    ok('model/effort/position still mapped alongside capabilities')
    // INHERIT sentinel → null on the legacy member
    assert.equal(payload[0].model, null)
    assert.equal(payload[0].effort, null)
    ok('INHERIT sentinel → null (model/effort) unchanged')
  }

  // ── (b) inherit member (no caps) → NO capabilities key (legacy preserved) ──
  console.log('(b) "inherit" member → no capabilities key in the payload')
  {
    const rows: RosterRow[] = [
      { agentId: 'a-lead', role: 'lead', model: INHERIT, effort: INHERIT },
      { agentId: 'a-worker', role: 'worker', model: INHERIT, effort: INHERIT },
    ]
    const payload = rosterToMembers(rows)
    assert.ok(!('capabilities' in payload[0]), 'lead has no capabilities key')
    assert.ok(!('capabilities' in payload[1]), 'worker has no capabilities key')
    ok('no caps → key absent (not null/undefined value) → byte-identical to pre-S1.3')
    // JSON serialization (what the fetch body actually sends) carries no key either
    const sent = JSON.parse(JSON.stringify(payload[1]))
    assert.ok(!('capabilities' in sent))
    ok('JSON.stringify drops it too → column stays NULL = legacy gate')
  }

  // ── (c) tools:false serializes as { tools:false } (hard-disable, S1.2) ──
  console.log('(c) explicit tools:false → { tools:false }')
  {
    const rows: RosterRow[] = [
      { agentId: 'a-lead', role: 'lead', model: INHERIT, effort: INHERIT },
      { agentId: 'a-worker', role: 'worker', model: INHERIT, effort: INHERIT, caps: { tools: false } },
    ]
    const payload = rosterToMembers(rows)
    assert.deepEqual(payload[1].capabilities, { tools: false })
    ok('worker serializes { tools:false } (S1.2 resolveToolGate → OFF even on coder)')
    assert.ok(!('capabilities' in payload[0]))
    ok('the untouched lead in the same roster stays legacy (no key)')
  }

  // ── (d) connection→option uses AgentMcpServer.id, NOT McpServer.id ──
  console.log('(d) mcpConnectionToOption maps AgentMcpServer.id (the join row) into the allowlist')
  {
    // GET /api/agents/[id]/mcp returns AgentMcpServer rows; `id` is the join id (= amsId),
    // `mcpServer.id` is a DIFFERENT id that only appears (sliced) inside the tool NAME.
    const conn = {
      id: 'ams-xyz',
      mcpServerId: 'srv-1',
      enabled: true,
      mcpServer: { id: 'mcp-abc', name: 'Postgres', tools: [{}, {}, {}] },
    }
    const opt = mcpConnectionToOption(conn)
    assert.equal(opt.amsId, 'ams-xyz')
    ok('option.amsId === connection.id (AgentMcpServer.id)')
    assert.notEqual(opt.amsId, conn.mcpServer.id)
    ok('option.amsId is NOT connection.mcpServer.id (would break the S1.2 allowlist filter)')
    assert.equal(opt.name, 'Postgres')
    assert.equal(opt.toolCount, 3)
    ok('name from mcpServer.name; toolCount from tools.length')
    // graceful fallbacks when the McpServer name is missing
    const opt2 = mcpConnectionToOption({ id: 'ams-2', mcpServerId: 'srv-2' })
    assert.equal(opt2.amsId, 'ams-2')
    assert.equal(opt2.name, 'srv-2')
    assert.equal(opt2.toolCount, 0)
    ok('no mcpServer → name falls back to mcpServerId, toolCount 0 (no crash)')
  }

  console.log(`\n✅ v2s3 verify: ${passed} assertions passed`)
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
