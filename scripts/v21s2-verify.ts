// scripts/v21s2-verify.ts
// Local verification for Teams V2.1 — fatia S1.2 (Tema A': run the tool loop on the
// self-hosted Ollama path too). chatWithAgent (groq.ts) hits Prisma + Ollama, so its
// end-to-end path can't be driven here; the DECISIONS were kept/extracted as PURE
// functions (model-capabilities.ts, agent-tools.ts) and this script asserts them via tsx
// — no jest (OneDrive errno -4094). Run: npx tsx scripts/v21s2-verify.ts
//
// Required cases (from ROADMAP S1.2 + Sessão 2.md):
//   (a) Ollama member with tools:true on a supported Ollama id → gate enables function calling.
//   (b) mcpAllowlist / toolSkills / filesystem scope EXACTLY like the Groq/OpenRouter path.
//   (c) rawText (code-run on Ollama) → gate OFF (the @RUN/@DONE protection must NOT regress).
//   (d) Ollama id WITHOUT tool support → gate off, graceful text fallback (no crash).
//   (e) modelSupportsTools('ollama/llama3.1:8b') → true after the fix; ollama/<unknown> → false;
//       and handling the `ollama/` prefix does NOT change non-ollama ids (OpenRouter/Groq).
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
  // ── (e) modelSupportsTools: NEW Ollama recognition (strip `ollama/` + `:tag`) ──
  console.log('(e) modelSupportsTools — Ollama family ids now recognized on the bare name')
  {
    // the headline fix: a tagged Ollama llama id used to return false, now true
    assert.equal(modelSupportsTools('ollama/llama3.1:8b'), true)
    for (const m of ['ollama/llama3.2:3b', 'ollama/llama3.3:70b', 'ollama/qwen2.5:7b-instruct',
      'ollama/qwen2.5-coder:7b', 'ollama/qwen3:8b', 'ollama/mistral:latest',
      'ollama/mistral-nemo:12b', 'ollama/mixtral:8x7b', 'ollama/command-r:35b',
      'ollama/command-r-plus:104b', 'ollama/firefunction-v2:70b', 'ollama/hermes3:8b',
      'ollama/llama3-groq-tool-use:8b']) {
      assert.equal(modelSupportsTools(m), true, m)
    }
    ok('tool-capable Ollama families → true (prefix + :tag stripped, bare name matched)')
    // conservative: an Ollama family we did NOT allowlist stays false (graceful text)
    for (const m of ['ollama/gemma2:9b', 'ollama/phi3:mini', 'ollama/llama2:7b',
      'ollama/deepseek-r1:7b', 'ollama/codellama:13b']) {
      assert.equal(modelSupportsTools(m), false, m)
    }
    ok('unlisted Ollama families → false (no tools sent → no 400)')
  }

  // ── (e cont.) regression: the `ollama/` branch did NOT change non-ollama results ──
  console.log('(e) OpenRouter + Groq + legacy results unchanged by the S1.2 addition')
  {
    for (const m of ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-2.0-flash',
      'meta-llama/llama-3.1-70b-instruct', 'mistralai/mistral-large', 'x-ai/grok-2']) {
      assert.equal(modelSupportsTools(m), true, m)
    }
    ok('OpenRouter tool-capable families still → true')
    for (const m of ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'llama3-70b-8192']) {
      assert.equal(modelSupportsTools(m), true, m)
    }
    ok('Groq-native bare ids (S1.1) still → true')
    assert.equal(modelSupportsTools('qwen/qwen-2.5-coder-32b-instruct'), true)
    assert.equal(modelSupportsTools('deepseek/deepseek-coder'), true)
    ok('coder/qwen still recognized (legacy parity)')
    assert.equal(modelSupportsTools('gemma2-9b-it'), false)
    assert.equal(modelSupportsTools('foo/totally-unknown-model'), false)
    assert.equal(modelSupportsTools('deepseek/deepseek-r1'), false)
    assert.equal(modelSupportsTools(''), false)
    assert.equal(modelSupportsTools(null), false)
    ok('unlisted Groq / unknown / r1 / empty / null still → false')
  }

  // ── (a) Ollama member tools:true on a supported Ollama id → gate ON ──
  console.log('(a) tools:true on a supported Ollama id → enables function calling')
  {
    const gate = resolveToolGate({
      capabilities: { tools: true }, isCoderModel: false, rawText: false,
      modelSupportsTools: modelSupportsTools('ollama/llama3.1:8b'),
    })
    assert.equal(gate, true); ok('member tools:true + ollama/llama3.1:8b → gate ON')
  }

  // ── (c) rawText (code-run on Ollama) → gate OFF (no regression of @RUN/@DONE) ──
  console.log('(c) rawText code-run on a supported Ollama id → tools OFF (protection preserved)')
  {
    const gate = resolveToolGate({
      capabilities: { tools: true }, isCoderModel: true, rawText: true,
      modelSupportsTools: modelSupportsTools('ollama/qwen2.5-coder:7b'),
    })
    assert.equal(gate, false); ok('rawText true → gate OFF even with tools:true + coder model')
  }

  // ── (d) unsupported Ollama id → gate OFF (graceful text fallback) ──
  console.log('(d) unsupported Ollama id → tools off, falls through to plain completion')
  {
    const gate = resolveToolGate({
      capabilities: { tools: true }, isCoderModel: false, rawText: false,
      modelSupportsTools: modelSupportsTools('ollama/gemma2:9b'),
    })
    assert.equal(gate, false); ok('tools:true but ollama/gemma2 unsupported → gate OFF')
  }

  // also: member tools:false disables even on a supported Ollama id (semantics S1.2 #2)
  {
    const gate = resolveToolGate({
      capabilities: { tools: false }, isCoderModel: true, rawText: false,
      modelSupportsTools: modelSupportsTools('ollama/llama3.1:8b'),
    })
    assert.equal(gate, false); ok('member tools:false → gate OFF even on a supported Ollama id')
  }

  // ── (b) the Ollama path scopes tools with the SAME selectApiTools as Groq/OpenRouter ──
  console.log('(b) policy scoping on the Ollama path is identical to Groq/OpenRouter')
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
    assert.deepEqual(mcpDefsTagged.map(m => m.amsId), ['ams-db', 'ams-http'])
    ok('buildAgentToolDefs shape matches the shared helper (same as S1.1)')

    // mcpAllowlist + filesystem/toolSkills flags scope identically
    const policy: CapabilityPolicy = { tools: true, mcpAllowlist: ['ams-db'] }
    const scoped = selectApiTools({ capabilities: policy, readOnlyDefs, toolSkillDefs: toolSkillDefinitions, mcpDefs: mcpDefsTagged })
    assert.deepEqual(names(scoped), ['list_files', 'read_file', 'skill_translate', 'mcp__db123456__query'])
    ok('(b) mcpAllowlist scopes MCP exactly like the Groq/OpenRouter path')

    const noFs: CapabilityPolicy = { tools: true, filesystem: false }
    assert.deepEqual(names(selectApiTools({ capabilities: noFs, readOnlyDefs, toolSkillDefs: toolSkillDefinitions, mcpDefs: mcpDefsTagged })),
      ['skill_translate', 'mcp__db123456__query', 'mcp__ht789012__fetch'])
    ok('filesystem:false drops read-only tools; absent toolSkills/mcpAllowlist inherit')

    // no policy → byte-identical legacy concat order (regression — empty selection too)
    const all = selectApiTools({ capabilities: null, readOnlyDefs, toolSkillDefs: toolSkillDefinitions, mcpDefs: mcpDefsTagged })
    assert.deepEqual(all, [...readOnlyDefs, ...toolSkillDefinitions, ...mcpDefsTagged.map(m => m.def)])
    ok('(d) no policy → tool array identical to legacy [...readOnly, ...toolSkills, ...mcp]')

    // empty mcpAllowlist → no MCP tools (so an over-scoped member yields an empty array → no `tools` sent)
    const noneSelected = selectApiTools({
      capabilities: { tools: true, filesystem: false, toolSkills: false, mcpAllowlist: [] },
      readOnlyDefs, toolSkillDefs: toolSkillDefinitions, mcpDefs: mcpDefsTagged,
    })
    assert.deepEqual(noneSelected, [])
    ok('everything scoped out → empty array (Ollama path sends no `tools`, falls to plain completion)')
  }

  console.log(`\n✅ v21s2 verify: ${passed} assertions passed`)
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
