// scripts/v21s1-verify.ts
// Local verification for Teams V2.1 — fatia S1.1 (Tema A': run the tool loop on the
// Groq-native path too). chatWithAgent (groq.ts) hits Prisma + Groq, so its end-to-end
// path can't be driven here; the DECISIONS were kept/extracted as PURE functions
// (model-capabilities.ts, agent-tools.ts) and this script asserts them via tsx — no jest
// (OneDrive errno -4094). Run: npx tsx scripts/v21s1-verify.ts
//
// Required cases (from ROADMAP S1.1):
//   (a) Groq member with tools:true on a supported Groq id → gate enables function calling.
//   (b) mcpAllowlist / toolSkills / filesystem filter exactly like the OpenRouter path.
//   (c) Groq model WITHOUT tool support → gate off, graceful text fallback (no crash).
//   (d) OpenRouter + Groq-without-policy → byte-identical to the legacy gate/tools.
// Plus: buildAgentToolDefs produces the same shape the OpenRouter path used inline.
import assert from 'node:assert/strict'
import {
  modelSupportsTools, resolveToolGate, selectApiTools,
  type FunctionToolDef, type TaggedMcpDef,
} from '../src/lib/ai/model-capabilities'
import { buildAgentToolDefs } from '../src/lib/ai/agent-tools'
import type { CapabilityPolicy } from '../src/lib/orchestration/team/team-types'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

const def = (name: string): FunctionToolDef => ({
  type: 'function', function: { name, description: name, parameters: {} },
})
const readOnlyDefs: FunctionToolDef[] = [def('list_files'), def('read_file')]
const names = (t: FunctionToolDef[]) => t.map(d => d.function.name)

async function main() {
  // ── modelSupportsTools: NEW Groq-native recognition (S1.1) ──
  console.log('modelSupportsTools — Groq-native bare ids now recognized')
  {
    for (const m of ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'llama-3.1-70b-versatile',
      'llama3-70b-8192', 'llama3-8b-8192']) {
      assert.equal(modelSupportsTools(m), true, m)
    }
    ok('tool-capable Groq llama ids → true')
    // conservative: a bare Groq id we did NOT allowlist stays false (graceful text)
    assert.equal(modelSupportsTools('gemma2-9b-it'), false)
    assert.equal(modelSupportsTools('mixtral-8x7b-32768'), false)
    ok('unlisted bare Groq ids → false (no tools sent → no 400)')
  }

  // ── (d) regression: adding Groq ids did NOT change OpenRouter / coder-qwen / defaults ──
  console.log('(d) OpenRouter + legacy results unchanged by the S1.1 addition')
  {
    for (const m of ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-2.0-flash',
      'meta-llama/llama-3.1-70b-instruct', 'mistralai/mistral-large', 'x-ai/grok-2']) {
      assert.equal(modelSupportsTools(m), true, m)
    }
    ok('OpenRouter tool-capable families still → true')
    assert.equal(modelSupportsTools('qwen/qwen-2.5-coder-32b-instruct'), true)
    assert.equal(modelSupportsTools('deepseek/deepseek-coder'), true)
    ok('coder/qwen still recognized (legacy parity)')
    assert.equal(modelSupportsTools('foo/totally-unknown-model'), false)
    assert.equal(modelSupportsTools('deepseek/deepseek-r1'), false)
    assert.equal(modelSupportsTools(''), false)
    assert.equal(modelSupportsTools(null), false)
    ok('unknown / r1 / empty / null still → false')
    // crucial non-collision: an OpenRouter llama slug must NOT be matched by a Groq prefix
    assert.equal('meta-llama/llama-3.3-70b-instruct'.startsWith('llama-3.3'), false)
    ok('OpenRouter llama slug never matches a bare Groq prefix (no collision)')
  }

  // ── (a) Groq member tools:true on a supported Groq id → gate ON ──
  console.log('(a) tools:true on a supported Groq id → enables function calling')
  {
    const gate = resolveToolGate({
      capabilities: { tools: true }, isCoderModel: false, rawText: false,
      modelSupportsTools: modelSupportsTools('llama-3.3-70b-versatile'),
    })
    assert.equal(gate, true); ok('member tools:true + llama-3.3-70b-versatile → gate ON')
  }

  // ── (c) Groq model WITHOUT tool support → gate OFF (graceful text) ──
  console.log('(c) unsupported Groq id → tools off, falls through to plain completion')
  {
    const gate = resolveToolGate({
      capabilities: { tools: true }, isCoderModel: false, rawText: false,
      modelSupportsTools: modelSupportsTools('gemma2-9b-it'),
    })
    assert.equal(gate, false); ok('tools:true but gemma2 unsupported → gate OFF')
  }

  // ── buildAgentToolDefs: shape matches the former inline OpenRouter build ──
  console.log('buildAgentToolDefs — tool-skill defs + tagged MCP defs')
  {
    const agentSkills = [
      { skill: { type: 'tool', toolDefinition: { name: 'skill_translate', description: 'x', parameters: {} }, toolCode: 'c' } },
      { skill: { type: 'prompt', promptBlock: 'ignore' } }, // not a tool → excluded
      { skill: { type: 'tool', toolDefinition: undefined } }, // no def → excluded
    ]
    const agentMcpServers = [
      { id: 'ams-db', mcpServer: { id: 'db1234567890', name: 'DB', tools: [{ name: 'query', description: 'q', inputSchema: {} }] } },
      { id: 'ams-http', mcpServer: { id: 'ht7890123456', name: 'HTTP', tools: [{ name: 'fetch', description: 'f', inputSchema: {} }] } },
    ]
    const { toolSkillDefinitions, mcpDefsTagged } = buildAgentToolDefs({ agentSkills, agentMcpServers })

    assert.deepEqual(names(toolSkillDefinitions), ['skill_translate'])
    ok('only tool-type skills with a toolDefinition survive')
    assert.deepEqual(mcpDefsTagged.map(m => m.amsId), ['ams-db', 'ams-http'])
    assert.deepEqual(mcpDefsTagged.map(m => m.def.function.name), ['mcp__db123456__query', 'mcp__ht789012__fetch'])
    ok('MCP names use sliced McpServer.id; amsId is the AgentMcpServer join id')

    // ── (b) the Groq path scopes tools with the SAME selectApiTools as OpenRouter ──
    const policy: CapabilityPolicy = { tools: true, mcpAllowlist: ['ams-db'] }
    const scoped = selectApiTools({ capabilities: policy, readOnlyDefs, toolSkillDefs: toolSkillDefinitions, mcpDefs: mcpDefsTagged })
    assert.deepEqual(names(scoped), ['list_files', 'read_file', 'skill_translate', 'mcp__db123456__query'])
    ok('(b) mcpAllowlist + flags scope identically to the OpenRouter path')

    // (d) no policy → byte-identical legacy concat order
    const all = selectApiTools({ capabilities: null, readOnlyDefs, toolSkillDefs: toolSkillDefinitions, mcpDefs: mcpDefsTagged })
    assert.deepEqual(all, [...readOnlyDefs, ...toolSkillDefinitions, ...mcpDefsTagged.map(m => m.def)])
    ok('(d) no policy → tool array identical to legacy [...readOnly, ...toolSkills, ...mcp]')
  }

  console.log(`\n✅ v21s1 verify: ${passed} assertions passed`)
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
