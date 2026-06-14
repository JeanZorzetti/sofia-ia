// src/lib/queue/connection.ts
// Shared ioredis connection for BullMQ (Sub-projeto C — C0).
// BullMQ requires a dedicated connection with maxRetriesPerRequest = null.
import { Redis } from 'ioredis'

export const CODE_RUN_QUEUE = 'code-run'

let connection: Redis | null = null

export function getQueueConnection(): Redis {
  if (!connection) {
    const url = process.env.REDIS_URL
    if (!url) {
      throw new Error('REDIS_URL não configurada — a fila durável de code-runs precisa de um Redis persistente')
    }
    connection = new Redis(url, { maxRetriesPerRequest: null })
  }
  return connection
}
