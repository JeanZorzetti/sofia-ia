// src/lib/ai/claude-token-pool.ts
// Single source of truth for the Claude OAuth token pool + per-token cooldown +
// rate-limit detection + a generic failover wrapper. Pure (no network/DB), so it
// is fully unit-testable. Used by BOTH Claude execution paths of a team run:
//   - local-spawn (ClaudeCliService.generate, via chatWithAgent) — Next app process
//   - sandbox     (runClaudeInSandbox, via code-agent)           — worker process
//
// Each process keeps its OWN in-memory cooldown map (web ≠ worker). Acceptable:
// worst case is one extra probe per process against a limited account, which fails
// fast and rotates. A shared Redis cooldown is a possible v2.

const DEFAULT_COOLDOWN_MS = 5 * 60 * 60 * 1000 // 5h — matches the Claude usage window

function cooldownMs(): number {
  const raw = Number(process.env.CLAUDE_TOKEN_COOLDOWN_MS)
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_COOLDOWN_MS
}

let _cached: string[] | null = null

/**
 * Parse the token pool from env (cached). Precedence:
 *   1. CLAUDE_CODE_OAUTH_TOKENS — comma/newline-separated list (preferred)
 *   2. CLAUDE_CODE_OAUTH_TOKEN_1, _2, _3, … — numbered
 *   3. CLAUDE_CODE_OAUTH_TOKEN — single (current/back-compat behavior)
 */
export function loadClaudeTokens(): string[] {
  if (_cached) return _cached
  const out: string[] = []

  const list = process.env.CLAUDE_CODE_OAUTH_TOKENS
  if (list && list.trim()) {
    out.push(...list.split(/[,\n]/).map((s) => s.trim()).filter(Boolean))
  }

  if (out.length === 0) {
    for (let i = 1; i <= 20; i++) {
      const v = process.env[`CLAUDE_CODE_OAUTH_TOKEN_${i}`]
      if (v && v.trim()) out.push(v.trim())
    }
  }

  if (out.length === 0) {
    const single = process.env.CLAUDE_CODE_OAUTH_TOKEN
    if (single && single.trim()) {
      // Forgiving: accept a comma/newline list here too — a common mistake is using
      // the SINGULAR var name for the pool. OAuth tokens never contain commas, so
      // splitting a lone token is a no-op.
      out.push(...single.split(/[,\n]/).map((s) => s.trim()).filter(Boolean))
    }
  }

  _cached = [...new Set(out)] // de-dup, preserve order
  return _cached
}

/** Test seam: reset the cached token list + cooldowns (used by verify scripts). */
export function _resetClaudeTokenPool(): void {
  _cached = null
  cooldownUntil.clear()
}

export function hasClaudeTokenPool(): boolean {
  return loadClaudeTokens().length > 0
}

/** First token (pool[0]) or the single env token; undefined when none configured. */
export function primaryClaudeToken(): string | undefined {
  return loadClaudeTokens()[0]
}

// ── cooldown ──────────────────────────────────────────────────────────────────
const cooldownUntil = new Map<number, number>() // token index → epochMs free-at

export function markTokenLimited(index: number, ms: number = cooldownMs()): void {
  cooldownUntil.set(index, Date.now() + ms)
}

/**
 * Tokens not in cooldown, in pool order. If ALL are cooling down, the token that
 * frees soonest is returned LAST so a final attempt still happens against the
 * most-likely-to-be-recovered account.
 */
export function availableTokens(): { index: number; token: string }[] {
  const tokens = loadClaudeTokens()
  const now = Date.now()
  const free: { index: number; token: string }[] = []
  const cooling: { index: number; token: string; until: number }[] = []
  tokens.forEach((token, index) => {
    const until = cooldownUntil.get(index) ?? 0
    if (until <= now) free.push({ index, token })
    else cooling.push({ index, token, until })
  })
  if (free.length > 0) return free
  cooling.sort((a, b) => b.until - a.until) // soonest-free last
  return cooling.map(({ index, token }) => ({ index, token }))
}

// ── rate-limit detection (single source of truth) ─────────────────────────────
// Matches the REAL Claude Code limit messages, which can arrive on stderr OR as the
// success output itself (exit 0), e.g. "You've hit your session limit · resets 5pm
// (UTC)". Word boundaries avoid false positives like "rate limiter".
const RATE_LIMIT_RE =
  /\brate[\s_-]?limit\b|\b(usage|session|weekly|daily|hourly|opus|sonnet)\s+limit\b|hit your .{0,30}?\blimit\b|\blimit reached\b|reached your .{0,30}?\blimit\b|too many requests|\b429\b|\bquota\b|resets?\b[^.\n]{0,20}\(utc\)/i

export function isClaudeRateLimit(text: string | undefined | null): boolean {
  return !!text && RATE_LIMIT_RE.test(text)
}

/**
 * Typed signal so the sandbox path (which returns a message string on normal
 * failures, not a throw) can flag a rate-limit specifically and trigger failover.
 */
export class ClaudeRateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ClaudeRateLimitError'
  }
}

// ── failover ──────────────────────────────────────────────────────────────────
export interface FailoverOptions {
  /** True when the thrown error means "this account is rate/usage limited". */
  isLimited: (err: unknown) => boolean
  /** Token used when the pool is empty (back-compat: ambient/single-env behavior). */
  fallbackToken?: string
}

/**
 * Run `run(token)` against the token pool with automatic failover: on a limited
 * error the current token is put in cooldown and the next available token is
 * tried. Resolves with the first success; a non-limited error surfaces immediately.
 * When every token is exhausted, throws a ClaudeRateLimitError summarizing it.
 *
 * Pool empty → runs `run(fallbackToken)` exactly once (no failover).
 */
export async function withClaudeTokenFailover<T>(
  run: (token: string | undefined, index: number) => Promise<T>,
  opts: FailoverOptions,
): Promise<T> {
  const candidates = availableTokens()
  if (candidates.length === 0) {
    return run(opts.fallbackToken, 0) // no pool → single attempt (ambient/single token)
  }

  const poolSize = loadClaudeTokens().length
  let lastErr: unknown
  for (let i = 0; i < candidates.length; i++) {
    const { index, token } = candidates[i]
    try {
      return await run(token, index)
    } catch (err) {
      if (!opts.isLimited(err)) throw err // real failure → surface immediately
      markTokenLimited(index)
      lastErr = err
      const next = candidates[i + 1]
      if (next) {
        console.warn(`[claude-pool] conta #${index + 1} no limite → rotacionando para conta #${next.index + 1} (pool de ${poolSize})`)
      } else {
        console.warn(`[claude-pool] todas as ${candidates.length} conta(s) disponíveis no limite — run vai terminar como rate_limited (pool de ${poolSize})`)
      }
    }
  }
  throw new ClaudeRateLimitError(
    `Todas as ${candidates.length} conta(s) Claude no limite. Último erro: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`,
  )
}
