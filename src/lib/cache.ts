/**
 * Redis cache wrapper with graceful fallback
 * Se Redis não estiver disponível, usa cache em memória
 */

interface CacheEntry {
  value: any;
  expiresAt: number;
}

// Cache em memória como fallback
const memoryCache = new Map<string, CacheEntry>();

// Limpar cache expirado a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt < now) {
      memoryCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Verifica se Redis está disponível
 */
function isRedisAvailable(): boolean {
  return !!process.env.REDIS_URL;
}

/**
 * Obtém cliente Redis se disponível
 */
async function getRedisClient() {
  if (!isRedisAvailable()) {
    return null;
  }

  try {
    // Redis é opcional - se não estiver instalado, usa memória
    // Para instalar: npm install redis
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const redis = require('redis');
    const client = redis.createClient({
      url: process.env.REDIS_URL,
    });

    await client.connect();
    return client;
  } catch (error) {
    console.warn('Redis não disponível, usando cache em memória');
    return null;
  }
}

/**
 * Armazena valor no cache
 * @param key Chave do cache
 * @param value Valor a ser armazenado
 * @param ttl Time to live em segundos (padrão: 300 = 5 minutos)
 */
export async function cacheSet(key: string, value: any, ttl = 300): Promise<void> {
  try {
    const redis = await getRedisClient();

    if (redis) {
      // Usar Redis
      const serialized = JSON.stringify(value);
      await redis.setEx(key, ttl, serialized);
      await redis.disconnect();
    } else {
      // Usar cache em memória
      const expiresAt = Date.now() + ttl * 1000;
      memoryCache.set(key, { value, expiresAt });
    }
  } catch (error) {
    console.error('Erro ao armazenar no cache:', error);
    // Fallback silencioso para memória
    const expiresAt = Date.now() + ttl * 1000;
    memoryCache.set(key, { value, expiresAt });
  }
}

/**
 * Obtém valor do cache
 * @param key Chave do cache
 * @returns Valor armazenado ou null se não existir/expirou
 */
export async function cacheGet<T = any>(key: string): Promise<T | null> {
  try {
    const redis = await getRedisClient();

    if (redis) {
      // Usar Redis
      const cached = await redis.get(key);
      await redis.disconnect();

      if (cached) {
        return JSON.parse(cached) as T;
      }
      return null;
    } else {
      // Usar cache em memória
      const entry = memoryCache.get(key);

      if (!entry) {
        return null;
      }

      if (entry.expiresAt < Date.now()) {
        memoryCache.delete(key);
        return null;
      }

      return entry.value as T;
    }
  } catch (error) {
    console.error('Erro ao obter do cache:', error);
    return null;
  }
}

/**
 * Remove valor do cache
 * @param key Chave do cache
 */
export async function cacheDelete(key: string): Promise<void> {
  try {
    const redis = await getRedisClient();

    if (redis) {
      await redis.del(key);
      await redis.disconnect();
    } else {
      memoryCache.delete(key);
    }
  } catch (error) {
    console.error('Erro ao deletar do cache:', error);
    memoryCache.delete(key);
  }
}

/**
 * Limpa todo o cache (use com cautela)
 */
export async function cacheClear(): Promise<void> {
  try {
    const redis = await getRedisClient();

    if (redis) {
      await redis.flushDb();
      await redis.disconnect();
    } else {
      memoryCache.clear();
    }
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
    memoryCache.clear();
  }
}

/**
 * Wrapper para cachear resultados de funções
 * @param key Chave do cache
 * @param fn Função a ser executada se cache não existir
 * @param ttl Time to live em segundos
 */
export async function cachedFunction<T>(
  key: string,
  fn: () => Promise<T>,
  ttl = 300
): Promise<T> {
  // Tentar obter do cache
  const cached = await cacheGet<T>(key);

  if (cached !== null) {
    return cached;
  }

  // Executar função e armazenar resultado
  const result = await fn();
  await cacheSet(key, result, ttl);

  return result;
}

/**
 * Gera chave de cache baseada em parâmetros
 */
export function generateCacheKey(prefix: string, ...params: any[]): string {
  const paramStr = params.map(p => JSON.stringify(p)).join(':');
  return `${prefix}:${paramStr}`;
}
