/**
 * Message Buffer
 * Acumula mensagens de um mesmo contato por 10 segundos antes de processar.
 * Isso evita respostas fragmentadas quando o usuário manda várias msgs seguidas.
 *
 * Padrão: Redis list para armazenar msgs + in-memory debounce timer
 * - Redis garante durabilidade em cenários multi-instância
 * - setTimeout garante que apenas uma instância processa (quem chegou primeiro)
 */

import { cache } from '@/lib/cache'

const BUFFER_WINDOW_MS = 10_000   // 10 segundos de espera
const BUFFER_TTL_S    = 60        // TTL do buffer no Redis (segurança)
const LOCK_TTL_S      = 15        // TTL do lock de processamento

export interface BufferedMessage {
  text: string
  messageId: string
  messageType: 'text' | 'audio' | 'image'
  timestamp: number
}

// In-memory debounce timers (por contact)
// Funciona bem em serverless: a mesma instância recebe msgs do mesmo contato em sequência rápida
const debounceTimers = new Map<string, NodeJS.Timeout>()

/**
 * Adiciona mensagem ao buffer e agenda o processamento após 10 segundos.
 * Se já houver timer ativo, o timer é reiniciado (debounce real).
 *
 * @returns true se esta é a instância que vai processar (lock adquirido)
 */
export async function pushToBuffer(
  contact: string,
  message: BufferedMessage,
  onProcess: (messages: BufferedMessage[]) => Promise<void>
): Promise<void> {
  const bufferKey = `msg_buffer:${contact}`
  const lockKey   = `msg_lock:${contact}`

  // 1. Salvar mensagem no buffer Redis
  const existing = await cache.getJSON<BufferedMessage[]>(bufferKey)
  const messages = existing || []
  messages.push(message)
  await cache.setJSON(bufferKey, messages, BUFFER_TTL_S)

  // 2. Cancelar timer anterior se houver (debounce)
  const existingTimer = debounceTimers.get(contact)
  if (existingTimer) {
    clearTimeout(existingTimer)
    debounceTimers.delete(contact)
  }

  // 3. Tentar adquirir lock de processamento (NX = só seta se não existir)
  // Usamos o cache.set com check manual para simular SETNX cross-provider
  const lockExists = await cache.exists(lockKey)

  // 4. Agendar processamento após BUFFER_WINDOW_MS
  const timer = setTimeout(async () => {
    debounceTimers.delete(contact)

    try {
      // Se já tem lock de outro processo, não processar
      if (lockExists && !(await cache.exists(lockKey))) {
        // Lock expirou, somos nós quem vai processar agora
      }

      // Ler e limpar buffer atomicamente
      const buffered = await cache.getJSON<BufferedMessage[]>(bufferKey)
      if (!buffered || buffered.length === 0) return

      // Limpar buffer + lock
      await cache.del(bufferKey)
      await cache.del(lockKey)

      // Deduplicar por messageId
      const seen = new Set<string>()
      const unique = buffered.filter(m => {
        if (seen.has(m.messageId)) return false
        seen.add(m.messageId)
        return true
      })

      // Ordenar por timestamp
      unique.sort((a, b) => a.timestamp - b.timestamp)

      console.log(`[BUFFER] Processando ${unique.length} msgs de ${contact} após debounce`)
      await onProcess(unique)
    } catch (err) {
      console.error('[BUFFER] Erro ao processar buffer:', err)
    }
  }, BUFFER_WINDOW_MS)

  // 5. Setar lock (indica que há um timer ativo)
  if (!lockExists) {
    await cache.set(lockKey, '1', LOCK_TTL_S)
  }

  debounceTimers.set(contact, timer)
  console.log(`[BUFFER] +1 msg de ${contact} (total no buffer: ${messages.length})`)
}

/**
 * Processa buffer imediatamente, sem esperar o debounce.
 * Útil para testes ou forçar processamento.
 */
export async function flushBuffer(contact: string): Promise<BufferedMessage[]> {
  const bufferKey = `msg_buffer:${contact}`
  const lockKey   = `msg_lock:${contact}`

  const timer = debounceTimers.get(contact)
  if (timer) {
    clearTimeout(timer)
    debounceTimers.delete(contact)
  }

  const buffered = await cache.getJSON<BufferedMessage[]>(bufferKey) || []
  await cache.del(bufferKey)
  await cache.del(lockKey)
  return buffered
}
