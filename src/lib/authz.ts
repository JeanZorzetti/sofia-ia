import { createHash, timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'
import type { JWTPayload } from '@/lib/auth'

/**
 * Authorization helpers — Sprint 0 (seguranca P0).
 *
 * Modelo de propriedade: por usuario (dono). `role === 'admin'` contorna o filtro
 * e enxerga todos os recursos. Use `ownerId(auth)` para escopar queries por dono
 * de forma reutilizavel e type-safe.
 */

export function isAdmin(auth: { role?: string } | null | undefined): boolean {
  return auth?.role === 'admin'
}

/**
 * Valor a ser usado no campo de dono de um `where` Prisma para restringir o
 * recurso ao usuario atual:
 *   - admin  -> `undefined` (Prisma ignora o campo -> ve todos)
 *   - demais -> `auth.id`   (filtra pelo dono)
 *
 * Como `undefined` e ignorado pelo Prisma e os campos de `where` sao opcionais,
 * isto e type-safe sem casts. Exemplos:
 *
 *   // leitura escopada
 *   prisma.agent.findFirst({ where: { id, createdBy: ownerId(auth) } })
 *
 *   // mutacao: verificar posse ANTES de update/delete por id unico
 *   const owned = await prisma.agent.findFirst({ where: { id, createdBy: ownerId(auth) }, select: { id: true } })
 *   if (!owned) return 404
 *   await prisma.agent.update({ where: { id }, data })
 *
 *   // delete atomico
 *   const { count } = await prisma.agent.deleteMany({ where: { id, createdBy: ownerId(auth) } })
 *   if (count === 0) return 404
 */
export function ownerId(auth: JWTPayload): string | undefined {
  return isAdmin(auth) ? undefined : auth.id
}

// --- Cron authentication ---------------------------------------------------

/** Compara dois segredos em tempo constante (digests de tamanho fixo). */
function safeEqual(a: string, b: string): boolean {
  const ah = createHash('sha256').update(a).digest()
  const bh = createHash('sha256').update(b).digest()
  return timingSafeEqual(ah, bh)
}

/**
 * Extrai o segredo de cron de qualquer formato usado pelos callers existentes,
 * para que `verifyCronAuth` seja drop-in sem quebrar jobs ja agendados:
 *   Authorization: Bearer <s>  |  x-cron-secret: <s>  |  ?secret=<s>
 */
function extractCronSecret(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7)
  const headerSecret = req.headers.get('x-cron-secret')
  if (headerSecret) return headerSecret
  return req.nextUrl.searchParams.get('secret')
}

/**
 * Valida a autenticacao de uma rota de cron de forma timing-safe e fail-closed.
 * Exige `CRON_SECRET` definido (sem fallback hardcoded): se ausente, recusa.
 */
export function verifyCronAuth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron] CRON_SECRET nao definido — recusando requisicao (fail-closed)')
    return false
  }
  const provided = extractCronSecret(req)
  if (!provided) return false
  return safeEqual(provided, secret)
}
