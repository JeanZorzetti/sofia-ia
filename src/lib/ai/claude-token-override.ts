// src/lib/ai/claude-token-override.ts
// 011-byos: per-run override for the Claude subscription token, propagated by
// AsyncLocalStorage. An execution entrypoint (worker job / startTeamRun / inline
// runner) that resolves the run OWNER's token wraps the whole run with
// `runWithClaudeToken(token, fn)`; the two Claude call sites (code-agent.ts,
// groq.ts) read `currentClaudeTokenOverride()` and, when present, use that single
// token instead of the platform pool. Pure: zero deps beyond node:async_hooks, and
// it NEVER touches claude-token-pool.ts. Override absent → both call sites keep the
// pool failover byte-identical (Constituição II).
import { AsyncLocalStorage } from 'node:async_hooks'

const als = new AsyncLocalStorage<string>()

/** Establish the override for the duration of `fn` (propagates through its async tree). */
export function runWithClaudeToken<T>(token: string, fn: () => Promise<T>): Promise<T> {
  return als.run(token, fn)
}

/** The user's Claude token for the current run, or undefined outside any override context. */
export function currentClaudeTokenOverride(): string | undefined {
  return als.getStore()
}
