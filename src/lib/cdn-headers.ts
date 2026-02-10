/**
 * CDN and caching headers configuration
 * Otimiza entrega de assets estáticos e APIs cacheáveis
 */

export interface CacheConfig {
  maxAge: number; // seconds
  sMaxAge?: number; // CDN cache duration
  staleWhileRevalidate?: number;
  staleIfError?: number;
  public?: boolean;
  immutable?: boolean;
}

/**
 * Presets de cache para diferentes tipos de conteúdo
 */
export const CACHE_PRESETS = {
  // Assets estáticos (imagens, fonts, etc)
  static: {
    maxAge: 31536000, // 1 ano
    sMaxAge: 31536000,
    public: true,
    immutable: true,
  },

  // Assets com hash (build output)
  hashed: {
    maxAge: 31536000, // 1 ano
    sMaxAge: 31536000,
    public: true,
    immutable: true,
  },

  // Páginas HTML
  html: {
    maxAge: 0,
    sMaxAge: 3600, // 1 hora no CDN
    staleWhileRevalidate: 86400, // 24 horas
    public: true,
  },

  // API com dados frequentes
  apiFrequent: {
    maxAge: 60, // 1 minuto
    sMaxAge: 60,
    staleWhileRevalidate: 300, // 5 minutos
    public: true,
  },

  // API com dados raros
  apiRare: {
    maxAge: 300, // 5 minutos
    sMaxAge: 300,
    staleWhileRevalidate: 3600, // 1 hora
    public: true,
  },

  // Dados públicos estáveis
  publicData: {
    maxAge: 3600, // 1 hora
    sMaxAge: 3600,
    staleWhileRevalidate: 86400, // 24 horas
    public: true,
  },

  // Sem cache (dados privados ou muito dinâmicos)
  noCache: {
    maxAge: 0,
    sMaxAge: 0,
    public: false,
  },
} as const;

/**
 * Gera header Cache-Control a partir da configuração
 */
export function generateCacheControlHeader(config: CacheConfig): string {
  const directives: string[] = [];

  // Public/Private
  if (config.public === false) {
    directives.push('private');
  } else {
    directives.push('public');
  }

  // Max-Age
  directives.push(`max-age=${config.maxAge}`);

  // S-Maxage (CDN)
  if (config.sMaxAge !== undefined) {
    directives.push(`s-maxage=${config.sMaxAge}`);
  }

  // Stale While Revalidate
  if (config.staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
  }

  // Stale If Error
  if (config.staleIfError !== undefined) {
    directives.push(`stale-if-error=${config.staleIfError}`);
  }

  // Immutable
  if (config.immutable) {
    directives.push('immutable');
  }

  return directives.join(', ');
}

/**
 * Headers de segurança e performance
 */
export const SECURITY_HEADERS = {
  // Previne clickjacking
  'X-Frame-Options': 'SAMEORIGIN',

  // Previne MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // XSS Protection
  'X-XSS-Protection': '1; mode=block',

  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions Policy
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * Headers de compressão
 */
export const COMPRESSION_HEADERS = {
  'Content-Encoding': 'gzip',
  Vary: 'Accept-Encoding',
};

/**
 * Headers de CORS para API pública
 */
export function getCorsHeaders(origin?: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 horas
  };
}

/**
 * Aplica headers de cache a uma Response
 */
export function applyCacheHeaders(
  response: Response,
  preset: keyof typeof CACHE_PRESETS | CacheConfig
): Response {
  const config = typeof preset === 'string' ? CACHE_PRESETS[preset] : preset;
  const cacheControl = generateCacheControlHeader(config);

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', cacheControl);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Headers para forçar revalidação (ex: após mutação)
 */
export function getRevalidateHeaders() {
  return {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };
}

/**
 * Headers de ETag para cache condicional
 */
export function generateETag(content: string): string {
  // Hash simples do conteúdo
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `"${Math.abs(hash).toString(36)}"`;
}

/**
 * Verifica se cliente tem versão válida em cache (ETag)
 */
export function checkETag(requestETag: string | null, currentETag: string): boolean {
  if (!requestETag) return false;
  return requestETag === currentETag || requestETag === `W/${currentETag}`;
}

/**
 * Headers de rate limiting
 */
export function getRateLimitHeaders(limit: number, remaining: number, reset: number) {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': reset.toString(),
  };
}
