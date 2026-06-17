/**
 * crypto.ts — criptografia simétrica para segredos em repouso (AES-256-GCM).
 *
 * Usado para guardar o access token da WABA por tenant (WhatsAppAccount.accessToken)
 * sem deixá-lo em texto puro no banco. Não confundir com `sha256` de api-key-auth.ts,
 * que é hash unidirecional (não reversível).
 *
 * Chave: `ENCRYPTION_KEY` no env. Aceita uma chave base64 de 32 bytes (recomendado:
 *   `openssl rand -base64 32`) ou qualquer string (derivada via scrypt).
 *
 * Formato do ciphertext: `iv.tag.dados` (cada parte em base64). O IV de 12 bytes é
 * o recomendado para GCM; a auth tag detecta adulteração na descriptografia.
 *
 * A chave é resolvida lazy (dentro das funções) para não quebrar o build quando a
 * env var ainda não está disponível — mesmo padrão do Groq SDK.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error('ENCRYPTION_KEY não configurada (necessária para criptografar segredos da WABA)')
  }
  // base64 de exatamente 32 bytes → usa direto
  try {
    const decoded = Buffer.from(raw, 'base64')
    if (decoded.length === 32) return decoded
  } catch {
    // segue para derivação
  }
  // qualquer outra string → deriva 32 bytes de forma determinística
  return scryptSync(raw, 'polaris-waba-encryption-salt', 32)
}

/** Criptografa um texto. Retorna `iv.tag.dados` em base64. */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`
}

/** Descriptografa um valor produzido por `encrypt`. Lança se a tag não bater. */
export function decrypt(payload: string): string {
  const key = getKey()
  const [ivB64, tagB64, dataB64] = payload.split('.')
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Formato de ciphertext inválido (esperado iv.tag.dados)')
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}

/** Heurística: o valor parece um ciphertext deste módulo (iv.tag.dados)? */
export function isEncrypted(value: string): boolean {
  return /^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/.test(value)
}
