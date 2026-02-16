/**
 * API Middleware - Caching e Rate Limiting
 * Composição de middlewares para APIs Next.js
 */

import { NextRequest, NextResponse } from 'next/server';
import { cache, TTL } from './cache';
import { RedisRateLimiter, RateLimitResult, rateLimiters, getRateLimitHeaders } from './rate-limit-redis';
import { getAuthFromRequest } from './auth';

interface MiddlewareConfig {
  rateLimit?: {
    enabled: boolean;
    limiter?: RedisRateLimiter;
    keyGenerator?: (req: NextRequest) => string;
  };
  cache?: {
    enabled: boolean;
    ttl: number;
    keyGenerator?: (req: NextRequest) => string;
    condition?: (req: NextRequest) => boolean;
  };
  auth?: {
    required: boolean;
    roles?: string[];
  };
}

/**
 * Extrai IP do request
 */
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Gera chave de cache padrão
 */
function defaultCacheKey(req: NextRequest): string {
  const url = new URL(req.url);
  return `api:cache:${url.pathname}:${url.search}`;
}

/**
 * Gera chave de rate limit padrão
 */
function defaultRateLimitKey(req: NextRequest): string {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (token) {
    return `token:${token.slice(0, 16)}`;
  }
  return `ip:${getClientIP(req)}`;
}

/**
 * Middleware composto para APIs
 */
export function withMiddleware(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  config: MiddlewareConfig = {}
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    // 1. Rate Limiting
    if (config.rateLimit?.enabled) {
      const limiter = config.rateLimit.limiter || rateLimiters.api;
      const key = config.rateLimit.keyGenerator?.(req) || defaultRateLimitKey(req);
      
      const result = await limiter.check(key);
      
      if (!result.allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded', retryAfter: result.retryAfter },
          { 
            status: 429,
            headers: getRateLimitHeaders(result),
          }
        );
      }
    }

    // 2. Autenticação
    if (config.auth?.required) {
      const user = await getAuthFromRequest(req);
      
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (config.auth.roles && !config.auth.roles.includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      // Adiciona user ao context
      context = { ...context, user };
    }

    // 3. Cache (apenas para GET)
    if (config.cache?.enabled && req.method === 'GET') {
      const shouldCache = config.cache.condition?.(req) ?? true;
      
      if (shouldCache) {
        const cacheKey = config.cache.keyGenerator?.(req) || defaultCacheKey(req);
        
        // Tenta buscar do cache
        const cached = await cache.get(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          return NextResponse.json(data.body, {
            status: data.status,
            headers: {
              'X-Cache': 'HIT',
              'Cache-Control': `max-age=${config.cache.ttl}`,
            },
          });
        }

        // Executa handler e salva no cache
        const response = await handler(req, context);
        
        if (response.status === 200) {
          const body = await response.clone().json().catch(() => null);
          if (body) {
            await cache.set(
              cacheKey,
              JSON.stringify({ body, status: response.status }),
              config.cache.ttl
            );
          }
        }
        
        return response;
      }
    }

    // Executa handler sem cache
    return handler(req, context);
  };
}

/**
 * Helper para criar handler de API com caching
 */
export function withCache(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  ttl: number = TTL.MEDIUM
) {
  return withMiddleware(handler, {
    cache: { enabled: true, ttl },
  });
}

/**
 * Helper para criar handler de API com rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  limiter?: RedisRateLimiter
) {
  return withMiddleware(handler, {
    rateLimit: { 
      enabled: true,
      limiter,
    },
    auth: { required: true },
  });
}

/**
 * Helper para criar handler protegido (auth + rate limit)
 */
export function withAuth(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  options: { roles?: string[] } = {}
) {
  return withMiddleware(handler, {
    auth: { required: true, roles: options.roles },
    rateLimit: { enabled: true },
  });
}

/**
 * Helper completo: auth + rate limit + cache
 */
export function withAll(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  config: {
    ttl?: number;
    limiter?: RedisRateLimiter;
    roles?: string[];
  } = {}
) {
  return withMiddleware(handler, {
    auth: { required: true, roles: config.roles },
    rateLimit: { enabled: true, limiter: config.limiter },
    cache: { enabled: true, ttl: config.ttl || TTL.MEDIUM },
  });
}
