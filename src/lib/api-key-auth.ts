import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'

export interface ApiKeyAuthResult {
  userId: string
  keyId: string
  scopes: string[]
}

/**
 * SHA-256 de uma string. Retorna hex lowercase.
 */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/**
 * Autentica uma requisição via Bearer token sk-*.
 * Tenta primeiro pelo keyHash (novo formato),
 * depois pelo campo key direto (compatibilidade com chaves antigas).
 */
export async function getAuthFromApiKey(request: Request): Promise<ApiKeyAuthResult | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return null

  let rawKey: string | null = null

  if (authHeader.startsWith('Bearer sk-') || authHeader.startsWith('Bearer sk_')) {
    rawKey = authHeader.replace('Bearer ', '')
  } else if (authHeader.startsWith('Bearer ')) {
    // Aceita qualquer Bearer token para compatibilidade
    rawKey = authHeader.replace('Bearer ', '')
  }

  // Também aceita X-API-Key header
  if (!rawKey) {
    const xApiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key')
    if (xApiKey) rawKey = xApiKey
  }

  if (!rawKey) return null

  const hash = sha256(rawKey)

  // Tenta buscar por hash (chaves novas)
  let apiKey = await prisma.apiKey.findFirst({
    where: { keyHash: hash, revokedAt: null, status: 'active' },
  })

  // Fallback: busca pela chave direta (chaves antigas sem hash)
  if (!apiKey) {
    apiKey = await prisma.apiKey.findFirst({
      where: { key: rawKey, revokedAt: null, status: 'active' },
    })
  }

  if (!apiKey) return null

  // Atualiza lastUsedAt sem bloquear a resposta
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {})

  const scopes = (apiKey.scopes || 'read,execute').split(',').map((s) => s.trim())

  return { userId: apiKey.userId, keyId: apiKey.id, scopes }
}

/**
 * Verifica se um scope está presente nos scopes da chave.
 */
export function hasScope(auth: ApiKeyAuthResult, scope: string): boolean {
  return auth.scopes.includes(scope) || auth.scopes.includes('*')
}
