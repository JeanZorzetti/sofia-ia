import { cache } from './cache'

// ─────────────────────────────────────────────────────────────────────────
// Rate limiting — modulo unico (Sprint 1).
//
// Consolidacao das duas implementacoes que existiam (in-memory sincrona +
// Redis assincrona) num so modulo, atras de uma interface com adapter:
//   - `rateLimit()` (sincrona, in-memory) — atalho legado usado por ~134 rotas,
//      mantido intacto para nao quebrar callers.
//   - `RateLimiter` (assincrona) — usa um `RateLimitStore` injetavel. O default
//     (`CacheStore`) delega ao `cache` compartilhado (Redis/Upstash em prod,
//     memory como fallback), preservando o rate-limit distribuido sem duplicar
//     codigo. `MemoryStore` permite forcar in-memory.
// ─────────────────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 60s
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) store.delete(key)
    }
  }, 60000)
}

/**
 * Rate-limit sincrono in-memory. Mantido por compatibilidade com os ~134
 * callers existentes (`rateLimit(key, max, windowMs)`).
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs }
  }

  entry.count++
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt }
}

// Pre-configured limits matching the original project
export const RATE_LIMITS = {
  general: { max: 1000, window: 15 * 60 * 1000 },
  auth: { max: 5, window: 15 * 60 * 1000 },
  instanceCreation: { max: 10, window: 10 * 60 * 1000 },
  qrCode: { max: 20, window: 5 * 60 * 1000 },
  messages: { max: 30, window: 60 * 1000 },
  aiChat: { max: 60, window: 60 * 1000 },           // 60 AI requests/min per user
  ideChat: { max: 120, window: 60 * 1000 },          // 120 IDE requests/min (devs iterate fast)
  orchestration: { max: 20, window: 60 * 1000 },     // 20 orchestration runs/min
} as const

// ─── Async limiter (adapter-based) ─────────────────────────────────────────

export interface RateLimitConfig {
  windowMs: number // Janela de tempo em ms
  maxRequests: number // Maximo de requisicoes por janela
  keyPrefix?: string // Prefixo para as chaves
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
}

/**
 * Adapter de armazenamento do contador por janela. Permite trocar o backend
 * (Redis/Upstash via `cache`, ou in-memory) sem mexer na logica de limite.
 */
export interface RateLimitStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds: number): Promise<void>
}

/** Store padrao: delega ao `cache` compartilhado (Redis/Upstash/memory). */
class CacheStore implements RateLimitStore {
  get(key: string): Promise<string | null> {
    return cache.get(key)
  }
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await cache.set(key, value, ttlSeconds)
  }
}

const fixedWindowMemory = new Map<string, { value: string; expires: number }>()

/** Store in-memory para forcar rate-limit local (sem cache distribuido). */
export class MemoryStore implements RateLimitStore {
  async get(key: string): Promise<string | null> {
    const item = fixedWindowMemory.get(key)
    if (!item) return null
    if (item.expires && item.expires < Date.now()) {
      fixedWindowMemory.delete(key)
      return null
    }
    return item.value
  }
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    fixedWindowMemory.set(key, { value, expires: Date.now() + ttlSeconds * 1000 })
  }
}

/**
 * Rate limiter assincrono com janela fixa, backend plugavel via `RateLimitStore`.
 * Fail-open: em caso de erro do store, permite a requisicao (mesma politica da
 * implementacao Redis anterior).
 */
export class RateLimiter {
  private config: RateLimitConfig & { keyPrefix: string }
  private store: RateLimitStore

  constructor(config: RateLimitConfig, store: RateLimitStore = new CacheStore()) {
    this.config = { keyPrefix: 'ratelimit:', ...config }
    this.store = store
  }

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now()
    const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs
    const storeKey = `${this.config.keyPrefix}${key}:${windowStart}`

    const ttlSeconds = Math.ceil(this.config.windowMs / 1000)
    const resetTime = windowStart + this.config.windowMs

    try {
      const currentCountStr = await this.store.get(storeKey)
      const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0

      if (currentCount >= this.config.maxRequests) {
        return {
          allowed: false,
          limit: this.config.maxRequests,
          remaining: 0,
          resetTime,
          retryAfter: Math.ceil((resetTime - now) / 1000),
        }
      }

      await this.store.set(storeKey, String(currentCount + 1), ttlSeconds)

      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: Math.max(0, this.config.maxRequests - currentCount - 1),
        resetTime,
      }
    } catch (error) {
      console.error('Rate limit check error:', error)
      // Em caso de erro, permite a requisicao (fail-open)
      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: 0,
        resetTime,
      }
    }
  }
}

/** @deprecated nome legado da implementacao Redis — use `RateLimiter`. */
export type RedisRateLimiter = RateLimiter

// Rate limiters pre-configurados (backend = cache compartilhado)
export const rateLimiters = {
  // API geral: 100 req/minuto
  api: new RateLimiter({ windowMs: 60 * 1000, maxRequests: 100, keyPrefix: 'ratelimit:api:' }),
  // Autenticacao: 5 tentativas/minuto
  auth: new RateLimiter({ windowMs: 60 * 1000, maxRequests: 5, keyPrefix: 'ratelimit:auth:' }),
  // AI Chat: 20 mensagens/minuto
  ai: new RateLimiter({ windowMs: 60 * 1000, maxRequests: 20, keyPrefix: 'ratelimit:ai:' }),
  // Webhook: 1000 req/minuto
  webhook: new RateLimiter({ windowMs: 60 * 1000, maxRequests: 1000, keyPrefix: 'ratelimit:webhook:' }),
  // Analytics: 30 req/minuto
  analytics: new RateLimiter({ windowMs: 60 * 1000, maxRequests: 30, keyPrefix: 'ratelimit:analytics:' }),
}

/**
 * Headers para rate limiting (resultado do `RateLimiter`).
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
    ...(result.retryAfter && { 'Retry-After': String(result.retryAfter) }),
  }
}
