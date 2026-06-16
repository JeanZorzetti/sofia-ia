import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'

// ─────────────────────────────────────────────────────────────────────────
// Autenticacao por API key — modulo unico (Sprint 1).
//
// Consolidacao dos dois modulos que existiam (`api-key-auth.ts` +
// `api-key.ts`). Um unico lookup canonico (`findActiveApiKey`) faz:
//   1. busca por keyHash (SHA-256) — formato preferido;
//   2. fallback por `key` em plaintext (chaves legadas);
//   3. backfill lazy do keyHash quando achar via plaintext (migra para hash sem
//      precisar de migracao de dados);
//   4. atualiza lastUsedAt sem bloquear a resposta.
//
// ⚠️ O fallback plaintext NAO foi removido de proposito: as rotas de criacao
// historicamente salvaram a chave em plaintext sem keyHash, entao ha chaves em
// producao que so existem em plaintext. Removar o fallback agora as quebraria.
// A criacao passou a popular keyHash (e o backfill cobre as antigas no proximo
// uso); a remocao completa do plaintext fica para depois do backfill (ver
// docs/Refatoração/Sessão 3.md).
// ─────────────────────────────────────────────────────────────────────────

export interface ApiKeyAuthResult {
  userId: string
  keyId: string
  scopes: string[]
}

export interface ApiKeyUser {
  id: string
  email: string
  name: string
  role: string
}

/** SHA-256 de uma string. Retorna hex lowercase. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/**
 * Extrai a chave bruta de uma requisicao: `Authorization: Bearer <key>` ou
 * `X-API-Key: <key>`.
 */
export function getApiKeyFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7)
  return request.headers.get('x-api-key') || request.headers.get('X-API-Key') || null
}

/**
 * Lookup canonico de uma API key ativa. Tenta keyHash, depois plaintext (legado);
 * faz backfill lazy do keyHash e atualiza lastUsedAt (fire-and-forget).
 */
async function findActiveApiKey(rawKey: string) {
  const hash = sha256(rawKey)

  // 1) Formato novo: por hash
  let apiKey = await prisma.apiKey.findFirst({
    where: { keyHash: hash, revokedAt: null, status: 'active' },
  })

  // 2) Fallback legado: por chave em plaintext
  if (!apiKey) {
    apiKey = await prisma.apiKey.findFirst({
      where: { key: rawKey, revokedAt: null, status: 'active' },
    })
    // Backfill do keyHash para migrar a chave para o formato novo
    if (apiKey && !apiKey.keyHash) {
      prisma.apiKey
        .update({ where: { id: apiKey.id }, data: { keyHash: hash } })
        .catch(() => {})
    }
  }

  if (!apiKey) return null

  // Atualiza lastUsedAt sem bloquear a resposta
  prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {})

  return apiKey
}

/**
 * Autentica uma requisicao via Bearer token / X-API-Key e devolve o escopo da
 * chave (`{ userId, keyId, scopes }`). Usada pelas rotas v1/* e mcp/*.
 */
export async function getAuthFromApiKey(request: Request): Promise<ApiKeyAuthResult | null> {
  const rawKey = getApiKeyFromRequest(request)
  if (!rawKey) return null

  const apiKey = await findActiveApiKey(rawKey)
  if (!apiKey) return null

  const scopes = (apiKey.scopes || 'read,execute').split(',').map((s) => s.trim())
  return { userId: apiKey.userId, keyId: apiKey.id, scopes }
}

/**
 * Autentica uma requisicao via API key e devolve o usuario dono (ativo) da
 * chave. Usada pelas rotas public/* que precisam do usuario.
 */
export async function getUserFromApiKey(request: Request): Promise<ApiKeyUser | null> {
  const rawKey = getApiKeyFromRequest(request)
  if (!rawKey) return null

  const apiKey = await findActiveApiKey(rawKey)
  if (!apiKey) return null

  const user = await prisma.user.findUnique({
    where: { id: apiKey.userId },
    select: { id: true, email: true, name: true, role: true, status: true },
  })
  if (!user || user.status !== 'active') return null

  return { id: user.id, email: user.email, name: user.name, role: user.role }
}

/** Verifica se um scope esta presente nos scopes da chave. */
export function hasScope(auth: ApiKeyAuthResult, scope: string): boolean {
  return auth.scopes.includes(scope) || auth.scopes.includes('*')
}
