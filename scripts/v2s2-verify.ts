// scripts/v2s2-verify.ts
// Local verification for Teams V2 — fatia S1.2 (enforce the per-member tool gate by
// policy). chatWithAgent (groq.ts) hits Prisma + OpenRouter, so its end-to-end path
// can't be driven here; the DECISION was extracted into pure helpers
// (src/lib/ai/model-capabilities.ts), and this script asserts them via tsx — no jest
// (OneDrive errno -4094). Run: npx tsx scripts/v2s2-verify.ts
//
// Required cases (from ROADMAP S1.2):
//   (a) member with tools:true on a non-coder BUT supported model → gate enables tools.
//   (b) mcpAllowlist filters MCP servers (only allowed ones reach apiTools).
//   (c) rawText / code-run does NOT regress (tools off even with tools:true).
//   (d) model WITHOUT tool support → falls back to text, no crash.
//   (e) regression: member WITHOUT policy + coder model → identical to legacy gate.
import assert from 'node:assert/strict'
import {
  modelSupportsTools, resolveToolGate, selectApiTools,
  type FunctionToolDef, type TaggedMcpDef,
} from '../src/lib/ai/model-capabilities'
import type { CapabilityPolicy } from '../src/lib/orchestration/team/team-types'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

// ── fixtures: the three tool families, in the legacy order ──
const def = (name: string): FunctionToolDef => ({
  type: 'function', function: { name, description: name, parameters: {} },
})
const readOnlyDefs: FunctionToolDef[] = [def('list_files'), def('read_file')]
const toolSkillDefs: FunctionToolDef[] = [def('skill_translate')]
const mcpDefs: TaggedMcpDef[] = [
  { amsId: 'ams-db', def: def('mcp__db123456__query') },
  { amsId: 'ams-http', def: def('mcp__ht789012__fetch') },
]
const names = (t: FunctionToolDef[]) => t.map(d => d.function.name)

async function main() {
  // ── modelSupportsTools: allowlist + conservative default (decision #1) ──
  console.log('modelSupportsTools — allowlist + default off')
  {
    for (const m of ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-2.0-flash',
      'meta-llama/llama-3.1-70b-instruct', 'mistralai/mistral-large', 'x-ai/grok-2']) {
      assert.equal(modelSupportsTools(m), true, m)
    }
    ok('known tool-capable families → true')
    // legacy parity: coder/qwen recognized so a legacy coder run does NOT regress
    assert.equal(modelSupportsTools('qwen/qwen-2.5-coder-32b-instruct'), true)
    assert.equal(modelSupportsTools('deepseek/deepseek-coder'), true)
    ok('coder/qwen recognized (legacy parity)')
    // conservative default: unknown / empty / null → false (graceful fallback to text)
    assert.equal(modelSupportsTools('foo/totally-unknown-model'), false)
    assert.equal(modelSupportsTools('deepseek/deepseek-r1'), false) // r1 reasoning not in allowlist
    assert.equal(modelSupportsTools(''), false)
    assert.equal(modelSupportsTools(null), false)
    assert.equal(modelSupportsTools(undefined), false)
    ok('unknown / empty / null → false (default off, no 400)')
  }

  // ── (a) tools:true on a non-coder BUT supported model → gate ON ──
  console.log('(a) tools:true on non-coder supported model → enables function calling')
  {
    const supported = modelSupportsTools('openai/gpt-4o') // true
    const gate = resolveToolGate({
      capabilities: { tools: true }, isCoderModel: false, rawText: false, modelSupportsTools: supported,
    })
    assert.equal(gate, true); ok('member tools:true + openai/gpt-4o → gate ON despite non-coder')
  }

  // ── (b) mcpAllowlist filters MCP servers (only allowed reach apiTools) ──
  console.log('(b) mcpAllowlist filters MCP servers')
  {
    const policy: CapabilityPolicy = { tools: true, mcpAllowlist: ['ams-db'] }
    const tools = selectApiTools({ capabilities: policy, readOnlyDefs, toolSkillDefs, mcpDefs })
    assert.deepEqual(names(tools), ['list_files', 'read_file', 'skill_translate', 'mcp__db123456__query'])
    ok('only the allowlisted AgentMcpServer (ams-db) survives')
    assert.ok(!names(tools).includes('mcp__ht789012__fetch')); ok('ams-http excluded by allowlist')
    // empty allowlist → no MCP tools at all
    const none = selectApiTools({ capabilities: { mcpAllowlist: [] }, readOnlyDefs, toolSkillDefs, mcpDefs })
    assert.deepEqual(names(none), ['list_files', 'read_file', 'skill_translate'])
    ok('empty allowlist → zero MCP tools')
  }

  // ── (c) rawText / code-run does NOT regress (tools off even with tools:true) ──
  console.log('(c) rawText forces plain completion (sandbox protection preserved)')
  {
    const gate = resolveToolGate({
      capabilities: { tools: true }, isCoderModel: true, rawText: true, modelSupportsTools: true,
    })
    assert.equal(gate, false); ok('tools:true + coder + supported, but rawText → gate OFF')
  }

  // ── (d) model WITHOUT tool support → falls back to text, no crash ──
  console.log('(d) unsupported model → tools off, graceful text fallback')
  {
    const gate = resolveToolGate({
      capabilities: { tools: true }, isCoderModel: false, rawText: false,
      modelSupportsTools: modelSupportsTools('foo/unknown'),
    })
    assert.equal(gate, false); ok('tools:true but model unsupported → gate OFF (no tools sent → no 400)')
  }

  // ── (e) regression: member WITHOUT policy → legacy coder gate, byte-identical tools ──
  console.log('(e) no policy → legacy gate + legacy tool array')
  {
    // legacy coder ON
    assert.equal(resolveToolGate({
      capabilities: null, isCoderModel: true, rawText: false,
      modelSupportsTools: modelSupportsTools('qwen/qwen-coder'),
    }), true); ok('no policy + coder model → gate ON (legacy)')
    // legacy non-coder OFF
    assert.equal(resolveToolGate({
      capabilities: null, isCoderModel: false, rawText: false, modelSupportsTools: false,
    }), false); ok('no policy + non-coder → gate OFF (legacy)')
    // tool array byte-identical to [...readOnly, ...toolSkills, ...mcp]
    const all = selectApiTools({ capabilities: null, readOnlyDefs, toolSkillDefs, mcpDefs })
    assert.deepEqual(all, [...readOnlyDefs, ...toolSkillDefs, ...mcpDefs.map(m => m.def)])
    ok('no policy → tool array identical to legacy concat (order preserved)')
  }

  // ── extra: tools:false explicitly disables everything, even on a coder model (decision #2) ──
  console.log('extra: tools:false hard-disables (even coder)')
  {
    assert.equal(resolveToolGate({
      capabilities: { tools: false }, isCoderModel: true, rawText: false, modelSupportsTools: true,
    }), false); ok('tools:false + coder + supported → gate OFF (hard kill)')
  }

  // ── extra: flag semantics — absent inherits (on), explicit false excludes (decision #2) ──
  console.log('extra: filesystem/toolSkills — absent inherits, false excludes')
  {
    const noFs = selectApiTools({ capabilities: { filesystem: false }, readOnlyDefs, toolSkillDefs, mcpDefs })
    assert.deepEqual(names(noFs), ['skill_translate', 'mcp__db123456__query', 'mcp__ht789012__fetch'])
    ok('filesystem:false drops the read-only FS tools')
    const noSkills = selectApiTools({ capabilities: { toolSkills: false }, readOnlyDefs, toolSkillDefs, mcpDefs })
    assert.deepEqual(names(noSkills), ['list_files', 'read_file', 'mcp__db123456__query', 'mcp__ht789012__fetch'])
    ok('toolSkills:false drops the tool-skill defs')
    // absent → both inherited (present), proven by the (e) byte-identical case above.
    // everything scoped out → empty array (groq.ts maps [] to no `tools` sent)
    const empty = selectApiTools({
      capabilities: { filesystem: false, toolSkills: false, mcpAllowlist: [] }, readOnlyDefs, toolSkillDefs, mcpDefs,
    })
    assert.deepEqual(empty, []); ok('all families scoped out → [] (→ no tools sent)')
  }

  console.log(`\n✅ v2s2 verify: ${passed} assertions passed`)
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
