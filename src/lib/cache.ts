/**
 * Cache Service - Redis/Upstash wrapper
 * Suporta Redis local, Upstash (serverless), e fallback para memory cache
 */

import { Redis } from 'ioredis';

// Configuração do Redis
const REDIS_URL = process.env.REDIS_URL;
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Cache em memória para fallback
const memoryCache = new Map<string, { value: string; expires: number }>();

export interface CacheProvider {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getJSON<T>(key: string): Promise<T | null>;
  setJSON<T>(key: string, value: T, ttl?: number): Promise<void>;
}

/**
 * Redis Provider (IORedis)
 */
class RedisProvider implements CacheProvider {
  private client: Redis;

  constructor(url: string) {
    this.client = new Redis(url, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async setJSON<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }
}

/**
 * Upstash Redis Provider (REST API)
 */
class UpstashProvider implements CacheProvider {
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  private async fetch(command: string, ...args: (string | number)[]): Promise<any> {
    const response = await fetch(`${this.url}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([command, ...args]),
    });

    if (!response.ok) {
      throw new Error(`Upstash error: ${response.statusText}`);
    }

    return response.json();
  }

  async get(key: string): Promise<string | null> {
    const result = await this.fetch('GET', key);
    return result.result;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.fetch('SETEX', key, ttl, value);
    } else {
      await this.fetch('SET', key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.fetch('DEL', key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.fetch('EXISTS', key);
    return result.result === 1;
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async setJSON<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }
}

/**
 * Memory Cache Provider (fallback)
 */
class MemoryProvider implements CacheProvider {
  async get(key: string): Promise<string | null> {
    const item = memoryCache.get(key);
    if (!item) return null;
    
    if (item.expires && item.expires < Date.now()) {
      memoryCache.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const expires = ttl ? Date.now() + ttl * 1000 : 0;
    memoryCache.set(key, { value, expires });
  }

  async del(key: string): Promise<void> {
    memoryCache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const item = memoryCache.get(key);
    if (!item) return false;
    
    if (item.expires && item.expires < Date.now()) {
      memoryCache.delete(key);
      return false;
    }
    
    return true;
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async setJSON<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }
}

/**
 * Factory para criar o provider de cache
 */
function createCacheProvider(): CacheProvider {
  if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
    console.log('Using Upstash Redis');
    return new UpstashProvider(UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN);
  }
  
  if (REDIS_URL) {
    console.log('Using Redis');
    return new RedisProvider(REDIS_URL);
  }
  
  console.log('Using Memory Cache (fallback)');
  return new MemoryProvider();
}

// Singleton instance
export const cache = createCacheProvider();

// TTL constants (em segundos)
export const TTL = {
  SHORT: 60,        // 1 minuto
  MEDIUM: 300,      // 5 minutos
  LONG: 3600,       // 1 hora
  DAY: 86400,       // 1 dia
  WEEK: 604800,     // 1 semana
} as const;

/**
 * Decorator para cache de funções
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl: number = TTL.MEDIUM
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const key = keyGenerator(...args);
    
    // Tenta buscar do cache
    const cached = await cache.getJSON<ReturnType<T>>(key);
    if (cached) {
      return cached;
    }
    
    // Executa a função
    const result = await fn(...args);
    
    // Salva no cache
    await cache.setJSON(key, result, ttl);
    
    return result;
  }) as T;
}

/**
 * Invalida cache por padrão
 */
export async function invalidateCache(pattern: string): Promise<void> {
  // Nota: implementação simplificada
  // Em produção, usar SCAN para Redis ou iterar keys para memory cache
  console.log(`Cache invalidation requested for pattern: ${pattern}`);
}
