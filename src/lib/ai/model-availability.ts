// src/lib/ai/model-availability.ts
// Resolve whether a model can actually be used, so the Teams picker doesn't offer
// dead models (a run with an unreachable provider fails at execution time).
//
// Two layers (see the "Modelos" page):
//   - config: instant, no network — is the provider's key/integration present?
//     CLI-backed providers can't be proven by config alone → 'unknown'.
//   - live test: a tiny real call (see POST /api/models/test) — resolves 'unknown'
//     and confirms 'available' end-to-end. API providers only; CLI depends on the host.

export type AvailabilityStatus = 'available' | 'unavailable' | 'unknown'

export interface ModelAvailability {
  status: AvailabilityStatus
  reason: string
}

export type ProviderFamily = 'groq' | 'openrouter' | 'claude-cli' | 'opencode' | 'ollama'

/** Provider routing — mirrors the branching in chatWithAgent() so availability
 *  matches how a run would actually dispatch the model. */
export function providerOf(modelId: string): ProviderFamily {
  if (modelId.startsWith('claude-')) return 'claude-cli'
  if (modelId.startsWith('opencode-')) return 'opencode'
  if (modelId.startsWith('ollama/')) return 'ollama' // before '/' check (ollama ids contain '/')
  if (modelId.includes('/')) return 'openrouter'
  return 'groq'
}

/** Config-based availability (instant, no network). */
export function configAvailability(modelId: string): ModelAvailability {
  switch (providerOf(modelId)) {
    case 'groq':
      return process.env.GROQ_API_KEY
        ? { status: 'available', reason: 'GROQ_API_KEY configurada' }
        : { status: 'unavailable', reason: 'GROQ_API_KEY ausente' }
    case 'openrouter':
      return process.env.OPENROUTER_API_KEY
        ? { status: 'available', reason: 'OPENROUTER_API_KEY configurada' }
        : { status: 'unavailable', reason: 'OPENROUTER_API_KEY ausente' }
    case 'ollama':
      return process.env.OLLAMA_BASE_URL
        ? { status: 'available', reason: 'OLLAMA_BASE_URL configurada' }
        : { status: 'unavailable', reason: 'OLLAMA_BASE_URL ausente' }
    case 'claude-cli':
      return { status: 'unknown', reason: 'CLI Claude — depende do host; use "testar"' }
    case 'opencode':
      return { status: 'unknown', reason: 'CLI Opencode — depende do host; use "testar"' }
  }
}
