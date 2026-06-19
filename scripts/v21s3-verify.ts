// scripts/v21s3-verify.ts
// Local verification for Teams V2.1 — fatia S1.3 (Tema A': translate a member's
// CapabilityPolicy into Claude CLI FLAGS, not a function-calling loop). The CLI services
// hit child_process / the sandbox, so the end-to-end spawn can't be driven here; the
// DECISION was extracted into the PURE helper cli-tool-flags.ts, and this script asserts
// it via tsx — no jest (OneDrive errno -4094). Run: npx tsx scripts/v21s3-verify.ts
//
// Required cases (from ROADMAP S1.3 + Sessão 3.md):
//   (a) policy read-only (chat-run) → --allowedTools WITHOUT Write/Bash/Edit (+ plan mode).
//   (b) mcpAllowlist → --mcp-config holds ONLY the allowed AgentMcpServer ids' servers.
//   (c) chat-run NEVER emits a write flag, even with tools:true (host FS is not isolated).
//   (d) code-run-sandbox → writes PRESERVED (skip-permissions ON) + mcpAllowlist applied.
//   (e) NO policy → flags identical to the legacy command (regression; chat AND sandbox).
import assert from 'node:assert/strict'
import {
  buildCliToolFlags, renderClaudeCliFlags, toCliMcpDescriptor,
  READ_ONLY_CLI_TOOLS, WRITE_CLI_TOOLS,
  type CliMcpServerDescriptor,
} from '../src/lib/ai/cli-tool-flags'
import type { CapabilityPolicy } from '../src/lib/orchestration/team/team-types'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

// Two fake MCP servers (caller-resolved descriptors). amsId = AgentMcpServer.id.
const mcpA: CliMcpServerDescriptor = { amsId: 'ams-A', name: 'serverA', config: { type: 'http', url: 'https://a' } }
const mcpB: CliMcpServerDescriptor = { amsId: 'ams-B', name: 'serverB', config: { type: 'http', url: 'https://b' } }
const allMcp = [mcpA, mcpB]

const hasNoWrite = (tools: string[] | undefined) =>
  !!tools && WRITE_CLI_TOOLS.every(w => !tools.includes(w))

function main() {
  // ── (e) regression FIRST: no policy → {} → legacy command in BOTH contexts ──
  console.log('(e) no policy → flags identical to the legacy command (chat + sandbox)')
  {
    for (const context of ['chat-run', 'code-run-sandbox'] as const) {
      const flags = buildCliToolFlags({ capabilities: null, context, mcpServers: allMcp })
      assert.deepEqual(flags, {}, `${context}: no-policy flags must be empty`)
      // The renderer must reproduce EXACTLY today's only flag.
      assert.deepEqual(renderClaudeCliFlags(flags), ['--dangerously-skip-permissions'])
    }
    // undefined policy behaves like null.
    assert.deepEqual(buildCliToolFlags({ context: 'chat-run' }), {})
    ok('(e) null/undefined policy → {} → renders just --dangerously-skip-permissions')
  }

  // ── (a) chat-run, read-only policy → allowedTools without Write/Bash/Edit + plan ──
  console.log('(a) chat-run read-only policy → --allowedTools sem Write/Bash/Edit')
  {
    const cap: CapabilityPolicy = { filesystem: true }
    const f = buildCliToolFlags({ capabilities: cap, context: 'chat-run' })
    assert.deepEqual(f.allowedTools, [...READ_ONLY_CLI_TOOLS])
    assert.ok(hasNoWrite(f.allowedTools), 'allowedTools excludes every write/exec tool')
    assert.deepEqual(f.disallowedTools, [...WRITE_CLI_TOOLS])
    assert.equal(f.permissionMode, 'plan')
    assert.equal(f.skipPermissions, false)
    const args = renderClaudeCliFlags(f)
    assert.ok(!args.includes('--dangerously-skip-permissions'), 'no skip on host')
    assert.ok(args.includes('--permission-mode') && args.includes('plan'))
    assert.ok(args.includes('--allowedTools') && args.includes('Read,Glob,Grep,LS'))
    ok('(a) chat-run read-only: allowedTools=read-only, plan mode, no host skip')
  }

  // ── (b) mcpAllowlist → --mcp-config holds ONLY the allowed servers ──
  console.log('(b) mcpAllowlist → --mcp-config correto (ids de AgentMcpServer)')
  {
    // Allow only server A.
    const cap: CapabilityPolicy = { tools: true, mcpAllowlist: ['ams-A'] }
    const f = buildCliToolFlags({ capabilities: cap, context: 'chat-run', mcpServers: allMcp })
    assert.deepEqual(Object.keys(f.mcpConfig!.mcpServers), ['serverA'])
    assert.deepEqual(f.mcpConfig!.mcpServers.serverA, mcpA.config)
    // The allowed server's tools are let through the allowlist (mcp__<server>).
    assert.ok(f.allowedTools!.includes('mcp__serverA'))
    assert.ok(!f.allowedTools!.includes('mcp__serverB'))
    // Empty allowlist → NO MCP at all.
    const none = buildCliToolFlags({ capabilities: { mcpAllowlist: [] }, context: 'chat-run', mcpServers: allMcp })
    assert.equal(none.mcpConfig, undefined)
    // Absent allowlist (policy present) → ALL servers.
    const all = buildCliToolFlags({ capabilities: { tools: true }, context: 'chat-run', mcpServers: allMcp })
    assert.deepEqual(Object.keys(all.mcpConfig!.mcpServers).sort(), ['serverA', 'serverB'])
    // The path is rendered only when a materialized config file exists.
    const args = renderClaudeCliFlags(f, { mcpConfigPath: '/tmp/x.json' })
    assert.ok(args.includes('--mcp-config') && args.includes('/tmp/x.json') && args.includes('--strict-mcp-config'))
    assert.ok(!renderClaudeCliFlags(f).includes('--mcp-config'), 'no path → no --mcp-config flag')
    ok('(b) mcpAllowlist scopes --mcp-config: subset / empty=none / absent=all')
  }

  // ── (c) chat-run NEVER emits a write flag, even with tools:true ──
  console.log('(c) chat-run nunca emite flag de escrita fora do sandbox (mesmo tools:true)')
  {
    const cap: CapabilityPolicy = { tools: true, filesystem: true, toolSkills: true }
    const f = buildCliToolFlags({ capabilities: cap, context: 'chat-run' })
    assert.ok(hasNoWrite(f.allowedTools), 'tools:true still grants no write tool on host')
    assert.equal(f.skipPermissions, false)
    const args = renderClaudeCliFlags(f)
    assert.ok(!args.includes('--dangerously-skip-permissions'))
    // Every write/exec tool is explicitly denied.
    for (const w of WRITE_CLI_TOOLS) assert.ok(f.disallowedTools!.includes(w))
    ok('(c) tools:true on host → still read-only, writes explicitly disallowed, no skip')
  }

  // ── (d) code-run-sandbox → writes preserved + mcpAllowlist applied ──
  console.log('(d) code-run-sandbox → escrita preservada + mcpAllowlist aplicada')
  {
    const cap: CapabilityPolicy = { tools: true, mcpAllowlist: ['ams-B'] }
    const f = buildCliToolFlags({ capabilities: cap, context: 'code-run-sandbox', mcpServers: allMcp })
    // Writes are the deliverable → skip stays ON, no allow/deny restriction by default.
    assert.equal(f.skipPermissions, true)
    assert.equal(f.allowedTools, undefined)
    assert.equal(f.disallowedTools, undefined)
    assert.equal(f.permissionMode, undefined)
    // mcpAllowlist honored (only server B).
    assert.deepEqual(Object.keys(f.mcpConfig!.mcpServers), ['serverB'])
    const args = renderClaudeCliFlags(f, { mcpConfigPath: '/tmp/polaris_mcp.json' })
    assert.ok(args.includes('--dangerously-skip-permissions'), 'sandbox keeps skip (writes)')
    assert.ok(args.includes('--mcp-config') && args.includes('/tmp/polaris_mcp.json'))
    // Explicit filesystem:false is the one opt-out → read-only even in the sandbox.
    const ro = buildCliToolFlags({ capabilities: { filesystem: false }, context: 'code-run-sandbox' })
    assert.equal(ro.skipPermissions, false)
    assert.deepEqual(ro.allowedTools, [...READ_ONLY_CLI_TOOLS])
    assert.ok(hasNoWrite(ro.allowedTools))
    ok('(d) sandbox: writes preserved + mcpAllowlist; filesystem:false opts out to read-only')
  }

  // ── toCliMcpDescriptor: faithful http/sse shaping + name slug ──
  console.log('toCliMcpDescriptor — http/sse transport, headers, slugified key')
  {
    const http = toCliMcpDescriptor({ amsId: 'x', name: 'My Server!', url: 'https://h', transport: 'http', headers: { Authorization: 'Bearer z' } })
    assert.equal(http.amsId, 'x')
    assert.equal(http.name, 'My_Server_', 'name slugified for the mcpServers key / mcp__ id')
    assert.deepEqual(http.config, { type: 'http', url: 'https://h', headers: { Authorization: 'Bearer z' } })
    const sse = toCliMcpDescriptor({ amsId: 'y', name: 'sse', url: 'https://s', transport: 'sse' })
    assert.equal((sse.config as any).type, 'sse')
    assert.ok(!('headers' in sse.config), 'empty headers omitted')
    // null/absent transport defaults to http.
    assert.equal((toCliMcpDescriptor({ amsId: 'z', name: 'n', url: 'https://n' }).config as any).type, 'http')
    ok('toCliMcpDescriptor maps transport/headers and slugifies the server key')
  }

  console.log(`\n✅ v21s3 verify: ${passed} assertions passed`)
}

main()
