import type { NextRequest } from 'next/server'
import { getAuthFromRequest, type JWTPayload } from '@/lib/auth'
import { apiUnauthorized } from '@/lib/api-response'

/**
 * HOF de autorizacao de handler — Sprint 1 (arquitetura).
 *
 * Injeta o `auth` (JWTPayload) no handler e responde 401 automaticamente quando
 * nao ha sessao valida, eliminando o bloco `getAuthFromRequest` + null-check
 * repetido em ~155 rotas.
 *
 * NAO substitui o middleware (que ja autentica todas as /api/*): e DRY + tipagem
 * no nivel do handler. Preserva a assinatura dos route handlers do Next 16 — o
 * segundo argumento (`context`, que contem `params: Promise<...>` nas rotas
 * dinamicas) e repassado intacto.
 *
 *   // rota estatica
 *   export const GET = withAuth(async (request, auth) => {
 *     const agents = await prisma.agent.findMany({ where: { createdBy: ownerId(auth) } })
 *     return apiOk(agents)
 *   })
 *
 *   // rota dinamica — params continua sendo Promise (await obrigatorio)
 *   export const GET = withAuth(async (request, auth, { params }: { params: Promise<{ id: string }> }) => {
 *     const { id } = await params
 *     ...
 *   })
 */
export type AuthedHandler<C> = (
  request: NextRequest,
  auth: JWTPayload,
  context: C
) => Promise<Response> | Response

export interface WithAuthOptions {
  /**
   * Resposta de 401 customizada — usar quando o grupo de rotas tem um envelope
   * diferente do padrao `{ success: false, error }` (ex.: flows usa
   * `{ data: null, error }`, knowledge usa `{ error }`). Preserva o contrato com
   * o cliente ao migrar grupos que nao seguem o envelope padrao.
   */
  onUnauthorized?: () => Response
}

export function withAuth<C = unknown>(
  handler: AuthedHandler<C>,
  options?: WithAuthOptions
) {
  // `context` e opcional na assinatura: rotas estaticas sao chamadas so com
  // `(request)`, enquanto rotas dinamicas recebem `(request, { params })`.
  return async (request: NextRequest, context?: C): Promise<Response> => {
    const auth = await getAuthFromRequest(request)
    if (!auth) return options?.onUnauthorized?.() ?? apiUnauthorized()
    return handler(request, auth, context as C)
  }
}
