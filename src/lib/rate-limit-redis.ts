/**
 * Rate Limiting with Redis
 * Rate limiting distribuído usando Redis/Upstash
 */

import { cache, TTL } from './cache';

export interface RateLimitConfig {
  windowMs: number;      // Janela de tempo em ms
  maxRequests: number;   // Máximo de requisições por janela
  keyPrefix?: string;    // Prefixo para as chaves
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Rate limiter usando Redis
 */
export class RedisRateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyPrefix: 'ratelimit:',
      ...config,
    };
  }

  /**
   * Verifica se uma requisição está dentro do limite
   */
  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs;
    const redisKey = `${this.config.keyPrefix}${key}:${windowStart}`;
    
    const ttlSeconds = Math.ceil(this.config.windowMs / 1000);
    const resetTime = windowStart + this.config.windowMs;

    try {
      // Busca contagem atual
      const currentCountStr = await cache.get(redisKey);
      const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;

      if (currentCount >= this.config.maxRequests) {
        return {
          allowed: false,
          limit: this.config.maxRequests,
          remaining: 0,
          resetTime,
          retryAfter: Math.ceil((resetTime - now) / 1000),
        };
      }

      // Incrementa contador
      await cache.set(redisKey, String(currentCount + 1), ttlSeconds);

      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: Math.max(0, this.config.maxRequests - currentCount - 1),
        resetTime,
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Em caso de erro, permite a requisição
      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: 0,
        resetTime,
      };
    }
  }
}

// Rate limiters pré-configurados
export const rateLimiters = {
  // API geral: 100 req/minuto
  api: new RedisRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyPrefix: 'ratelimit:api:',
  }),

  // Autenticação: 5 tentativas/minuto
  auth: new RedisRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'ratelimit:auth:',
  }),

  // AI Chat: 20 mensagens/minuto
  ai: new RedisRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20,
    keyPrefix: 'ratelimit:ai:',
  }),

  // Webhook: 1000 req/minuto
  webhook: new RedisRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 1000,
    keyPrefix: 'ratelimit:webhook:',
  }),

  // Analytics: 30 req/minuto
  analytics: new RedisRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
    keyPrefix: 'ratelimit:analytics:',
  }),
};

/**
 * Headers para rate limiting
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
    ...(result.retryAfter && { 'Retry-After': String(result.retryAfter) }),
  };
}
