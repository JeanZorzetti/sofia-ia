// src/lib/ai/model-efforts.ts
// Teams V2.2 — S2 (item 2). PURE (no I/O, no React, no DB): which reasoning-effort
// tiers each model supports, plus the per-path clamps. Same "capability helper"
// pattern as model-availability.ts / model-capabilities.ts. Tested by
// scripts/v22s2-verify.ts (tsx, no jest — OneDrive errno -4094).
//
// Source of truth = the `claude-api` skill's effort matrix:
//   - Effort (output_config.effort / CLI --effort) is GA on Opus 4.5/4.6/4.7/4.8,
//     Sonnet 4.6 and Fable 5. It ERRORS on Sonnet 4.5 / Haiku 4.5, and is meaningless
//     on non-reasoning models (Groq llama/mixtral, Ollama, GPT-4o family, plain
//     OpenRouter chat) and on the Opencode path (effort isn't plumbed there).
//   - `max`   added on Opus 4.6+ and Sonnet 4.6 (NOT Opus 4.5, NOT Haiku/older Sonnet).
//   - `xhigh` added on Opus 4.7+ (and Fable 5).
//
// So effort is a Claude-reasoning-model feature: every non-Claude id resolves to []
// (the dropdown shows only "auto"). The OpenRouter path still honors effort for the
// Claude-on-OpenRouter id `anthropic/claude-opus-4-5` (→ low/medium/high). Unknown /
// inherited model (the editor can't resolve the agent's own model) is permissive —
// it offers every tier and lets the save-clamp/runtime decide.

export const ALL_EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const
export type Effort = (typeof ALL_EFFORTS)[number]

const FULL: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max'] // Opus 4.7/4.8, Fable 5, CLI default
const WITH_MAX: Effort[] = ['low', 'medium', 'high', 'max'] //       Opus 4.6, Sonnet 4.6
const BASE: Effort[] = ['low', 'medium', 'high'] //                  Opus 4.5

const CLI_EFFORTS: ReadonlySet<string> = new Set(ALL_EFFORTS)

/** The "inherit from the agent" sentinel the roster pickers use (mirrors roster-mapping
 *  INHERIT, kept local so this file stays free of app/ imports). */
const INHERIT = 'inherit'

/**
 * The reasoning-effort tiers a model supports, in canonical order. Returns `[]` for
 * models where effort errors or is meaningless (Sonnet 4.5 / Haiku 4.5 / Groq / Ollama /
 * Opencode / GPT / plain OpenRouter chat). Unknown / inherited model → all tiers
 * (permissive: the editor can't resolve the agent's own model; the save-clamp + the
 * per-path runtime clamp keep it safe).
 */
export function effortsForModel(modelId?: string | null): Effort[] {
  if (!modelId || modelId === INHERIT) return [...FULL] // unknown / inherit → permissive
  const id = modelId.toLowerCase()

  // Claude family only — incl. the OpenRouter `anthropic/claude-*` ids and Fable/Mythos.
  const isClaude = id.includes('claude') || id.includes('fable') || id.includes('mythos')
  if (!isClaude) return [] // Groq / Ollama / OpenAI / plain OpenRouter → no effort

  // `claude-code-cli` is the CLI default (a current Opus) → full tiers.
  if (id === 'claude-code-cli') return [...FULL]

  // Version matrix. Distinct version substrings, no overlap.
  if (id.includes('opus-4-8') || id.includes('opus-4-7') || id.includes('fable-5') || id.includes('mythos-5')) return [...FULL]
  if (id.includes('opus-4-6') || id.includes('sonnet-4-6')) return [...WITH_MAX]
  if (id.includes('opus-4-5')) return [...BASE]

  // Everything else Claude-named (Sonnet 4.5 / Sonnet 4 / Haiku 4.5 / Haiku 3.5 / claude-3-* /
  // opencode-claude-*) → effort errors or isn't honored on its path.
  return []
}

/**
 * Server-side clamp for the roster save. Keeps `effort` only if it's a tier the model
 * supports; otherwise → null (auto). `inherit`/empty → null. A null/inherited model is
 * permissive (keeps any valid tier) since we can't resolve the agent's own model here.
 */
export function clampEffort(modelId: string | null | undefined, effort: string | null | undefined): string | null {
  if (!effort || effort === INHERIT) return null
  return effortsForModel(modelId).includes(effort as Effort) ? effort : null
}

/**
 * OpenRouter `reasoning_effort` only accepts low/medium/high — translate the higher Claude
 * tiers down instead of emitting a value the provider could reject (decision S2 #2: clamp).
 * `inherit`/empty/unknown → null (no `reasoning_effort` key = byte-identical to legacy).
 */
export function openRouterReasoningEffort(effort: string | null | undefined): 'low' | 'medium' | 'high' | null {
  if (!effort || effort === INHERIT) return null
  if (effort === 'xhigh' || effort === 'max') return 'high'
  if (effort === 'low' || effort === 'medium' || effort === 'high') return effort
  return null
}

/**
 * The Claude Code CLI `--effort` flag fragment appended to the spawn command. Returns the
 * empty string for `inherit`/empty/unknown so the command stays byte-identical to legacy.
 * The CLI honors all five tiers natively (`claude --help`: low/medium/high/xhigh/max), so
 * no down-translation here — the model-aware clamp already ran at save time.
 */
export function claudeCliEffortFlag(effort: string | null | undefined): string {
  if (!effort || effort === INHERIT) return ''
  return CLI_EFFORTS.has(effort) ? ` --effort ${effort}` : ''
}
