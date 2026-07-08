// src/lib/settings/claude-token-service.ts
// 011-byos: lifecycle of a user's own Claude subscription OAuth token.
//   - pure helpers (normalize / format / mask) — unit-tested with no DB/network
//   - active verification via the Claude CLI (only a token that works NOW is saved)
//   - encrypt-at-rest + upsert/getMetadata/delete (ciphertext NEVER leaves this module)
//   - runtime resolution + `runWithOwnerClaudeToken` used by the run entrypoints
// FR-003 (write-only) is structural: reads select `mask` + timestamps, never
// `encryptedToken`, so no read path can reach the plaintext.
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/crypto'
import { isClaudeRateLimit } from '@/lib/ai/claude-token-pool'
import { runWithClaudeToken } from '@/lib/ai/claude-token-override'

const TOKEN_PREFIX = 'sk-ant-oat'
const VERIFY_TIMEOUT_MS = 60_000 // active-verification kill deadline (SC: cadastro < 60s)

// ── pure helpers (unit-tested) ────────────────────────────────────────────────

/** Trim surrounding whitespace/newlines from a pasted token (internal ws stays → format-invalid). */
export function normalizeClaudeToken(raw: string): string {
  return raw.trim()
}

/** Format gate BEFORE any network call: `sk-ant-oat` prefix, no internal whitespace, plausible length. */
export function isValidClaudeTokenFormat(token: string): boolean {
  return token.startsWith(TOKEN_PREFIX) && token.length > 20 && !/\s/.test(token)
}

/** Display mask persisted at save time: first 10 + "..." + last 4 (e.g. `sk-ant-oat...h4Kx`). */
export function maskClaudeToken(token: string): string {
  return `${token.slice(0, 10)}...${token.slice(-4)}`
}

// ── active verification (R4) ──────────────────────────────────────────────────

export type ClaudeTokenVerifyResult = 'ok' | 'token_rejected' | 'token_rate_limited' | 'verification_unavailable'

/**
 * Prove the candidate token works AGAINST Claude right now via a minimal CLI call.
 * generate() resolves with the CLI output; an invalid token makes the CLI exit
 * non-zero with empty stdout → we read empty content as `token_rejected`. Rate-limit
 * banners reject → `token_rate_limited`. Spawn/timeout reject → `verification_unavailable`.
 * ponytail: empty-content heuristic; the CLI has no distinct "auth failed" exit we can read.
 */
export async function verifyClaudeToken(token: string): Promise<ClaudeTokenVerifyResult> {
  try {
    const { ClaudeCliService } = await import('@/services/claude-cli-service')
    const res = await ClaudeCliService.generate(
      'Responda apenas com: OK',
      process.cwd(),
      undefined, // systemPrompt
      undefined, // modelId → CLI default
      token,     // candidate OAuth token
      undefined, // capabilityOpts
      undefined, // effort
      undefined, // attachmentDir
      VERIFY_TIMEOUT_MS,
    )
    return res.content?.trim() ? 'ok' : 'token_rejected'
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (isClaudeRateLimit(msg)) return 'token_rate_limited'
    return 'verification_unavailable'
  }
}

// ── persistence (metadata never exposes the ciphertext) ───────────────────────

export type ClaudeTokenMetadata =
  | { configured: false }
  | { configured: true; mask: string; createdAt: Date; lastVerifiedAt: Date; lastUsedAt: Date | null }

export async function getClaudeTokenMetadata(userId: string): Promise<ClaudeTokenMetadata> {
  const row = await prisma.userClaudeToken.findUnique({
    where: { userId },
    select: { mask: true, createdAt: true, lastVerifiedAt: true, lastUsedAt: true }, // NUNCA encryptedToken
  })
  if (!row) return { configured: false }
  return { configured: true, ...row }
}

/** Persist a token that ALREADY passed verification (route verifies before calling). Returns whether it was a rotation. */
export async function saveClaudeToken(userId: string, token: string): Promise<{ rotated: boolean; mask: string }> {
  const mask = maskClaudeToken(token)
  const encryptedToken = encrypt(token)
  const existing = await prisma.userClaudeToken.findUnique({ where: { userId }, select: { id: true } })
  await prisma.userClaudeToken.upsert({
    where: { userId },
    create: { userId, encryptedToken, mask, lastVerifiedAt: new Date() },
    update: { encryptedToken, mask, lastVerifiedAt: new Date() },
  })
  return { rotated: !!existing, mask }
}

/** Remove the token permanently (value irrecoverable). Returns whether a row existed. */
export async function deleteClaudeToken(userId: string): Promise<boolean> {
  const res = await prisma.userClaudeToken.deleteMany({ where: { userId } })
  return res.count > 0
}

// ── runtime resolution + override wrapper ─────────────────────────────────────

/** Decrypt the owner's token for a run. Missing → null; a decrypt failure → null + warn (never the value). */
export async function resolveOwnerClaudeToken(userId: string): Promise<string | null> {
  const row = await prisma.userClaudeToken.findUnique({ where: { userId }, select: { encryptedToken: true } })
  if (!row) return null
  try {
    return decrypt(row.encryptedToken)
  } catch {
    console.warn(`[claude-token] decrypt falhou para o usuário ${userId} — ignorando override (volta ao pool)`)
    return null
  }
}

/**
 * Wrap a run's execution with the OWNER's Claude token when they have one, so the
 * two Claude call sites pick it up via the ALS override. No owner / no token → runs
 * `fn` directly (no ALS frame) → pool path byte-identical. Best-effort `last_used_at`
 * bump (1× per run, fire-and-forget). Used by every run entrypoint (worker, chat,
 * inline runner) — the coordinator is never touched.
 */
export async function runWithOwnerClaudeToken<T>(
  ownerUserId: string | null | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  if (!ownerUserId) return fn()
  const token = await resolveOwnerClaudeToken(ownerUserId)
  if (!token) return fn()
  prisma.userClaudeToken
    .update({ where: { userId: ownerUserId }, data: { lastUsedAt: new Date() } })
    .catch(() => {}) // UX metadata only — never blocks the run
  return runWithClaudeToken(token, fn)
}
