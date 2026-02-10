/**
 * Database connection pooling configuration
 * Otimiza conexões com o PostgreSQL para melhor performance
 */

import { PrismaClient } from '@prisma/client';

// Configurações de pool otimizadas
const poolConfig = {
  // Número máximo de conexões no pool
  // Para Vercel/serverless: 1-5 conexões por instância
  // Para servidor dedicado: 10-20 conexões
  connectionLimit: process.env.DB_POOL_SIZE ? parseInt(process.env.DB_POOL_SIZE) : 10,

  // Timeout de conexão (em ms)
  connectionTimeout: process.env.DB_CONNECT_TIMEOUT ? parseInt(process.env.DB_CONNECT_TIMEOUT) : 10000,

  // Pool timeout (em ms) - tempo máximo esperando por conexão disponível
  poolTimeout: process.env.DB_POOL_TIMEOUT ? parseInt(process.env.DB_POOL_TIMEOUT) : 30000,

  // Idle timeout (em ms) - tempo antes de fechar conexão ociosa
  idleTimeout: process.env.DB_IDLE_TIMEOUT ? parseInt(process.env.DB_IDLE_TIMEOUT) : 30000,
};

/**
 * Configura Prisma Client com connection pooling otimizado
 */
export function createPrismaClientWithPool(): PrismaClient {
  const datasourceUrl = process.env.DATABASE_URL;

  if (!datasourceUrl) {
    throw new Error('DATABASE_URL não está definida');
  }

  // Adiciona parâmetros de connection pooling à URL
  const url = new URL(datasourceUrl);

  // Connection pool size
  url.searchParams.set('connection_limit', poolConfig.connectionLimit.toString());

  // Pool timeout
  url.searchParams.set('pool_timeout', Math.floor(poolConfig.poolTimeout / 1000).toString());

  // Connect timeout
  url.searchParams.set('connect_timeout', Math.floor(poolConfig.connectionTimeout / 1000).toString());

  // Statement timeout (previne queries muito longas)
  url.searchParams.set('statement_timeout', '30000'); // 30 segundos

  // Schema (geralmente public)
  if (!url.searchParams.has('schema')) {
    url.searchParams.set('schema', 'public');
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: url.toString(),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

/**
 * Estatísticas de conexão do pool
 */
export interface PoolStats {
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalConnections: number;
  maxConnections: number;
}

/**
 * Obtém estatísticas do pool (simulado - Prisma não expõe diretamente)
 */
export function getPoolStats(): PoolStats {
  return {
    activeConnections: 0, // Prisma não expõe isso diretamente
    idleConnections: 0,
    waitingRequests: 0,
    totalConnections: 0,
    maxConnections: poolConfig.connectionLimit,
  };
}

/**
 * Testa conexão com o banco de dados
 */
export async function testDatabaseConnection(prisma: PrismaClient): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Erro ao testar conexão com banco de dados:', error);
    return false;
  }
}

/**
 * Monitora saúde da conexão periodicamente
 */
export async function monitorDatabaseHealth(
  prisma: PrismaClient,
  intervalMs = 60000
): Promise<() => void> {
  const interval = setInterval(async () => {
    const isHealthy = await testDatabaseConnection(prisma);

    if (!isHealthy) {
      console.warn('⚠️  Banco de dados não está respondendo corretamente');
    } else {
      console.log('✓ Banco de dados saudável');
    }
  }, intervalMs);

  // Retorna função para parar monitoramento
  return () => clearInterval(interval);
}

/**
 * Graceful shutdown - fecha conexões de forma limpa
 */
export async function gracefulShutdown(prisma: PrismaClient): Promise<void> {
  console.log('Fechando conexões com banco de dados...');

  try {
    await prisma.$disconnect();
    console.log('✓ Conexões fechadas com sucesso');
  } catch (error) {
    console.error('Erro ao fechar conexões:', error);
    throw error;
  }
}

/**
 * Configuração de retry para queries com falha temporária
 */
export async function retryableQuery<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Não retentar em erros de validação ou lógica
      if (error.code === 'P2002' || error.code === 'P2025') {
        throw error;
      }

      // Só retentar em erros de conexão
      const isConnectionError =
        error.message?.includes('connection') ||
        error.message?.includes('timeout') ||
        error.code === 'P1001' ||
        error.code === 'P1002';

      if (!isConnectionError || attempt === maxRetries) {
        throw error;
      }

      console.warn(`Query falhou (tentativa ${attempt}/${maxRetries}), tentando novamente em ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError;
}
