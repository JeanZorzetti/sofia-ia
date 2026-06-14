// src/lib/ai/ollama.ts
// Ollama via its OpenAI-compatible endpoint (`$OLLAMA_BASE_URL/v1`). Lazy init so
// the missing env var never breaks the build (mirrors the Groq/OpenRouter rule).
// Used as a Groq-rate-limit-free provider for Polaris Teams (incl. code-runs).
import OpenAI from 'openai'

let _ollama: OpenAI | null = null

/** Normalize the base URL (strip a trailing slash) and append the OpenAI-compat path. */
function ollamaBaseUrl(): string {
  const raw = (process.env.OLLAMA_BASE_URL ?? '').replace(/\/+$/, '')
  if (!raw) throw new Error('OLLAMA_BASE_URL não configurada — modelos ollama/* precisam dela')
  return `${raw}/v1`
}

export function getOllamaClient(): OpenAI {
  if (!_ollama) {
    _ollama = new OpenAI({
      baseURL: ollamaBaseUrl(),
      apiKey: 'ollama', // Ollama ignores the key; the SDK requires a non-empty value.
    })
  }
  return _ollama
}
