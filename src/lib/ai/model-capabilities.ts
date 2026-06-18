// src/lib/ai/model-capabilities.ts
// Teams V2 — fatia S1.2 (Tema A): pure decision helpers for the per-member tool gate.
//
// chatWithAgent (groq.ts) hits Prisma + OpenRouter, so its end-to-end gate can't be
// unit-tested on this machine (no DB/network, jest blocked by OneDrive errno -4094).
// The decision is therefore extracted here as PURE functions that the OpenRouter path
// calls; scripts/v2s2-verify.ts tests them directly (same pattern as team-board.ts /
// team-graph-agenda.ts). No DB, no env, no side effects — only a type import.
import type { CapabilityPolicy } from '@/lib/orchestration/team/team-types'

/** An OpenAI-format function tool definition (the shape OpenRouter expects in `tools`). */
export interface FunctionToolDef {
  type: 'function'
  function: { name: string; description: string; parameters: Record<string, unknown> }
}

/** An MCP tool def tagged with its source `AgentMcpServer.id` so `selectApiTools` can
 *  filter by `CapabilityPolicy.mcpAllowlist`. Decision S1.2 #3: the allowlist holds
 *  *AgentMcpServer* ids (the join row), matching the S1.1 type comment, the ROADMAP,
 *  and what the S1.3 RosterEditor multiselect will persist — NOT `McpServer.id` (which
 *  only appears, sliced, inside the tool *name*). */
export interface TaggedMcpDef {
  /** `AgentMcpServer.id` — the join row id. */
  amsId: string
  def: FunctionToolDef
}

/** Explicit allowlist of OpenRouter model families known to support native function
 *  calling. Conservative by design (decision S1.2 #1): an unknown model returns false,
 *  so the gate falls back to a plain-text completion instead of sending `tools` to a
 *  model that would 400. */
const TOOL_CAPABLE_PREFIXES = [
  'openai/',            // GPT-4o / GPT-4 / GPT-4.1 / o-series — function calling
  'anthropic/',         // Claude 3 / 3.5 / 4 — tool use
  'google/gemini',      // Gemini 1.5 / 2.x — function calling
  'meta-llama/llama-3', // Llama 3.1+ — tool calling
  'mistralai/',         // Mistral / Mixtral — tool calling
  'deepseek/deepseek-chat', // chat variant supports tools (r1 reasoning excluded)
  'x-ai/grok',          // Grok — tool calling
]

/** Does this OpenRouter model support native function calling (tools)?
 *  Pure + conservative: coder/qwen are recognized FIRST (legacy parity — the pre-S1.2
 *  gate enabled tools for them and they work, so a legacy coder run must NOT regress to
 *  tools-off), known families are allowed, everything else → false (graceful fallback to
 *  text; no crash, no 400). */
export function modelSupportsTools(model: string | null | undefined): boolean {
  if (!model) return false
  const m = model.toLowerCase()
  if (m.includes('coder') || m.includes('qwen')) return true
  return TOOL_CAPABLE_PREFIXES.some(prefix => m.startsWith(prefix))
}

/** Resolve whether provider-side tool execution (function calling) is ON for this call.
 *  Decision S1.2 #2: the member policy's `tools` is three-way —
 *    - `true`  → enable (even on a non-coder model),
 *    - `false` → disable everything (even on a coder model),
 *    - absent  → legacy gate (the coder-model heuristic decides).
 *  Always `&& !rawText` (code-runs force a plain completion — sandbox `@RUN` protection)
 *  and `&& modelSupportsTools` (never send `tools` to a model that can't do them). */
export function resolveToolGate(input: {
  capabilities?: CapabilityPolicy | null
  isCoderModel: boolean
  rawText: boolean
  modelSupportsTools: boolean
}): boolean {
  const { capabilities, isCoderModel, rawText, modelSupportsTools } = input
  let policyDecision: boolean
  if (capabilities?.tools === true) policyDecision = true
  else if (capabilities?.tools === false) policyDecision = false
  else policyDecision = isCoderModel // absent → legacy coder gate
  return policyDecision && !rawText && modelSupportsTools
}

/** Build the final `tools` array for the OpenRouter call, scoping each tool family by the
 *  member policy. Only called when the gate is ON. The output order matches the legacy
 *  `[...readOnly, ...toolSkills, ...mcp]` so a member WITHOUT a policy yields a
 *  byte-identical array (regression — case e). Decision S1.2 #2 semantics:
 *    - `filesystem` / `toolSkills` absent → inherit (included); explicit `false` → excluded.
 *    - `mcpAllowlist` absent → all MCP tools; present → only servers whose AgentMcpServer.id
 *      is in the list (an empty list → no MCP tools). */
export function selectApiTools(input: {
  capabilities?: CapabilityPolicy | null
  readOnlyDefs: FunctionToolDef[]
  toolSkillDefs: FunctionToolDef[]
  mcpDefs: TaggedMcpDef[]
}): FunctionToolDef[] {
  const { capabilities, readOnlyDefs, toolSkillDefs, mcpDefs } = input
  const out: FunctionToolDef[] = []
  if (capabilities?.filesystem !== false) out.push(...readOnlyDefs)
  if (capabilities?.toolSkills !== false) out.push(...toolSkillDefs)
  const allow = capabilities?.mcpAllowlist
  const mcps = allow ? mcpDefs.filter(m => allow.includes(m.amsId)) : mcpDefs
  out.push(...mcps.map(m => m.def))
  return out
}
