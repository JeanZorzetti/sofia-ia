import { prisma } from '@/lib/prisma'

export interface ApiKeyUser {
  id: string
  email: string
  name: string
  role: string
}

/**
 * Autentica uma requisição via X-API-Key header.
 * Retorna o usuário dono da chave ou null se inválida/inativa.
 */
export async function authenticateApiKey(apiKey: string | null): Promise<ApiKeyUser | null> {
  if (!apiKey) return null

  const record = await prisma.apiKey.findUnique({
    where: { key: apiKey },
    include: { user: { select: { id: true, email: true, name: true, role: true, status: true } } },
  })

  if (!record || record.status !== 'active') return null
  if (record.user.status !== 'active') return null

  // Atualiza lastUsedAt sem bloquear a resposta
  prisma.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {})

  return {
    id: record.user.id,
    email: record.user.email,
    name: record.user.name,
    role: record.user.role,
  }
}

export function getApiKeyFromRequest(req: Request): string | null {
  return req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '') || null
}
