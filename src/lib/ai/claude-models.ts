// src/lib/ai/claude-models.ts
// Single source of truth mapping Polaris model ids (claude-*) to the Claude Code
// CLI `--model` value. Used by both the local-spawn path (ClaudeCliService, via
// chatWithAgent) and the in-sandbox path (sandbox-cli-agent, Sub-projeto C).

const CLAUDE_CLI_MODEL_MAP: Record<string, string | undefined> = {
  'claude-code-cli': undefined, // CLI default → omit --model
  'claude-opus-4-6': 'claude-opus-4-6',
  'claude-sonnet-4-6': 'claude-sonnet-4-6',
  'claude-opus-4-5': 'claude-opus-4-5-20251101',
  'claude-sonnet-4-5-thinking': 'claude-sonnet-4-5-20250929',
  'claude-sonnet-4': 'claude-sonnet-4-20250514',
  'claude-haiku-4-5': 'claude-haiku-4-5-20251001',
  'claude-haiku-3-5': 'claude-3-5-haiku-20241022',
}

/**
 * Map a Polaris model id to the Claude CLI `--model` value.
 * Returns `undefined` for the CLI default (`claude-code-cli`) so the caller omits
 * the flag; unknown ids pass through unchanged (assumed to be a valid CLI id).
 */
export function resolveClaudeCliModel(modelId: string): string | undefined {
  if (modelId in CLAUDE_CLI_MODEL_MAP) return CLAUDE_CLI_MODEL_MAP[modelId]
  return modelId
}
