// scripts/v22s2-verify.ts
// Local verification for Teams V2.2 — S2 (item 2): efforts per model. The DECISION logic
// lives in a PURE helper (src/lib/ai/model-efforts.ts); this asserts it via tsx — no jest
// (OneDrive errno -4094). Run: npx tsx scripts/v22s2-verify.ts
//
// Required cases (ROADMAP S2 + Sessão 2.md):
//   (a) effortsForModel: Opus 4.8/4.7 include xhigh+max; Opus 4.6/Sonnet 4.6 have max but
//       NOT xhigh; Opus 4.5 only low/medium/high; Haiku 4.5 / Sonnet 4.5 / Groq / Ollama → [];
//       inherit/null → all tiers (permissive). anthropic/claude-opus-4-5 (OpenRouter) → BASE.
//   (b) clampEffort: an effort invalid for the model → null; valid → kept; null model permissive.
//   (c) claudeCliEffortFlag: high/xhigh/max → ` --effort <tier>`; null/inherit/unknown → '' (byte-identical).
//   (d) openRouterReasoningEffort: xhigh/max → high; low/medium/high passthrough; null/inherit → null.
import assert from 'node:assert/strict'
import {
  effortsForModel,
  clampEffort,
  claudeCliEffortFlag,
  openRouterReasoningEffort,
} from '../src/lib/ai/model-efforts'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

function main() {
  // ── (a) effortsForModel — the per-model tier matrix ──
  console.log('(a) effortsForModel mapeia cada modelo aos tiers reais')
  {
    // Opus 4.8 / 4.7 → full (xhigh + max).
    assert.deepEqual(effortsForModel('claude-opus-4-8'), ['low', 'medium', 'high', 'xhigh', 'max'])
    assert.deepEqual(effortsForModel('claude-opus-4-7'), ['low', 'medium', 'high', 'xhigh', 'max'])
    // Opus 4.6 / Sonnet 4.6 → max but NOT xhigh.
    assert.deepEqual(effortsForModel('claude-opus-4-6'), ['low', 'medium', 'high', 'max'])
    assert.deepEqual(effortsForModel('claude-sonnet-4-6'), ['low', 'medium', 'high', 'max'])
    assert.ok(effortsForModel('claude-opus-4-6').includes('max'), 'opus-4-6 tem max')
    assert.ok(!effortsForModel('claude-opus-4-6').includes('xhigh'), 'opus-4-6 NÃO tem xhigh')
    // Opus 4.5 → base (no max/xhigh).
    assert.deepEqual(effortsForModel('claude-opus-4-5'), ['low', 'medium', 'high'])
    // The OpenRouter Claude id (anthropic/ prefix) resolves the same as the bare id.
    assert.deepEqual(effortsForModel('anthropic/claude-opus-4-5'), ['low', 'medium', 'high'])
    // Effort errors / is meaningless → [] (dropdown shows only "auto").
    assert.deepEqual(effortsForModel('claude-haiku-4-5'), [])
    assert.deepEqual(effortsForModel('claude-sonnet-4-5-thinking'), [])
    assert.deepEqual(effortsForModel('anthropic/claude-sonnet-4-5'), [])
    assert.deepEqual(effortsForModel('anthropic/claude-haiku-4-5'), [])
    assert.deepEqual(effortsForModel('llama-3.3-70b-versatile'), [], 'Groq → []')
    assert.deepEqual(effortsForModel('deepseek-r1-distill-llama-70b'), [], 'Groq DeepSeek (no slash) → []')
    assert.deepEqual(effortsForModel('ollama/qwen2.5:7b-instruct'), [], 'Ollama → []')
    assert.deepEqual(effortsForModel('opencode-claude-opus-4'), [], 'Opencode → [] (effort não plumbed)')
    assert.deepEqual(effortsForModel('gpt-4o-mini'), [], 'OpenAI/plain OpenRouter → []')
    // Unknown / inherit → permissive (all tiers — editor can't resolve the agent model).
    assert.deepEqual(effortsForModel('inherit'), ['low', 'medium', 'high', 'xhigh', 'max'])
    assert.deepEqual(effortsForModel(null), ['low', 'medium', 'high', 'xhigh', 'max'])
    assert.deepEqual(effortsForModel(undefined), ['low', 'medium', 'high', 'xhigh', 'max'])
    // CLI default → full (current Opus).
    assert.deepEqual(effortsForModel('claude-code-cli'), ['low', 'medium', 'high', 'xhigh', 'max'])
    ok('(a) opus-4-8/4-7=full; opus-4-6/sonnet-4-6=+max-xhigh; opus-4-5=base; haiku/sonnet-4-5/groq/ollama/opencode=[]; inherit=full')
  }

  // ── (b) clampEffort — server save guard ──
  console.log('(b) clampEffort descarta effort inválido pro modelo')
  {
    // Valid for the model → kept.
    assert.equal(clampEffort('claude-opus-4-8', 'xhigh'), 'xhigh')
    assert.equal(clampEffort('claude-opus-4-8', 'max'), 'max')
    assert.equal(clampEffort('claude-opus-4-6', 'max'), 'max')
    assert.equal(clampEffort('claude-opus-4-5', 'high'), 'high')
    // Invalid for the model → null.
    assert.equal(clampEffort('claude-opus-4-6', 'xhigh'), null, 'xhigh num 4.6 → null')
    assert.equal(clampEffort('claude-opus-4-5', 'max'), null, 'max num 4.5 → null')
    assert.equal(clampEffort('claude-haiku-4-5', 'high'), null, 'qualquer effort num Haiku → null')
    assert.equal(clampEffort('llama-3.3-70b-versatile', 'medium'), null, 'effort num Groq → null')
    // Empty / inherit → null. null model → permissive (keeps a valid tier).
    assert.equal(clampEffort('claude-opus-4-8', null), null)
    assert.equal(clampEffort('claude-opus-4-8', 'inherit'), null)
    assert.equal(clampEffort(null, 'max'), 'max', 'modelo inherit → permissivo, mantém tier válido')
    assert.equal(clampEffort(null, null), null)
    ok('(b) tier válido p/ modelo mantido; inválido → null; inherit/empty → null; modelo null permissivo')
  }

  // ── (c) claudeCliEffortFlag — byte-identical legacy command when absent ──
  console.log('(c) claudeCliEffortFlag monta a flag certa; null → sem flag')
  {
    assert.equal(claudeCliEffortFlag('high'), ' --effort high')
    assert.equal(claudeCliEffortFlag('xhigh'), ' --effort xhigh')
    assert.equal(claudeCliEffortFlag('max'), ' --effort max')
    assert.equal(claudeCliEffortFlag('low'), ' --effort low')
    // Absent / inherit / garbage → '' (command stays byte-identical to legacy).
    assert.equal(claudeCliEffortFlag(null), '')
    assert.equal(claudeCliEffortFlag(undefined), '')
    assert.equal(claudeCliEffortFlag('inherit'), '')
    assert.equal(claudeCliEffortFlag(''), '')
    assert.equal(claudeCliEffortFlag('ultracode'), '', 'tier inexistente → sem flag (não inventa)')
    ok('(c) high/xhigh/max/low → " --effort <tier>"; null/inherit/garbage → "" (byte-idêntico)')
  }

  // ── (d) openRouterReasoningEffort — clamp xhigh/max → high ──
  console.log('(d) openRouterReasoningEffort clampa xhigh/max → high')
  {
    assert.equal(openRouterReasoningEffort('xhigh'), 'high')
    assert.equal(openRouterReasoningEffort('max'), 'high')
    assert.equal(openRouterReasoningEffort('low'), 'low')
    assert.equal(openRouterReasoningEffort('medium'), 'medium')
    assert.equal(openRouterReasoningEffort('high'), 'high')
    assert.equal(openRouterReasoningEffort(null), null)
    assert.equal(openRouterReasoningEffort('inherit'), null)
    assert.equal(openRouterReasoningEffort('ultracode'), null, 'tier inexistente → null (não emite valor inválido)')
    ok('(d) xhigh/max→high; low/medium/high passthrough; null/inherit/garbage→null')
  }

  console.log(`\n✅ v22s2 verify: ${passed} assertions passed`)
}

main()
