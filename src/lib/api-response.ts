import { NextResponse } from 'next/server'

/**
 * Envelope de resposta padrao das APIs — Sprint 1 (arquitetura).
 *
 * O padrao do projeto e `{ success, data, error }` (maioria das rotas). Estes
 * helpers centralizam a forma do envelope para novas rotas e para conversoes
 * incrementais, sem reescrever as 219 rotas de uma vez (mudar o shape quebra o
 * frontend que consome — converter por grupo, conferindo o consumidor).
 *
 * Uso:
 *   return apiOk(agents)                       // { success: true, data: agents }
 *   return apiOk(agent, { status: 201 })       // 201 Created
 *   return apiOk(items, { meta: { count } })   // inclui meta
 *   return apiError('Nao encontrado', 404)     // { success: false, error: '...' }
 */

export interface ApiSuccess<T> {
  success: true
  data: T
  meta?: unknown
  message?: string
}

export interface ApiFailure {
  success: false
  error: string
}

export function apiOk<T>(
  data: T,
  init?: { status?: number; meta?: unknown; message?: string }
): NextResponse {
  const body: Record<string, unknown> = { success: true, data }
  if (init?.meta !== undefined) body.meta = init.meta
  if (init?.message !== undefined) body.message = init.message
  return NextResponse.json(body, { status: init?.status ?? 200 })
}

export function apiError(
  error: string,
  status = 400,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ success: false, error, ...extra }, { status })
}

/** 401 com o envelope padrao. */
export const apiUnauthorized = (error = 'Unauthorized') => apiError(error, 401)
/** 403 com o envelope padrao. */
export const apiForbidden = (error = 'Forbidden') => apiError(error, 403)
/** 404 com o envelope padrao (use para nao vazar existencia em recursos de outro dono). */
export const apiNotFound = (error = 'Not found') => apiError(error, 404)
