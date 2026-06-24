// 005-agentic-companies — GET /api/companies/niches
// Lista os nichos semente do blueprint (estáticos). Autenticado (withAuth) mas sem escopo
// de dono — os nichos são catálogo global.
import { withAuth } from '@/lib/with-auth'
import { apiOk } from '@/lib/api-response'
import { listNiches } from '@/lib/companies/company-blueprint'

export const GET = withAuth(async () => {
  return apiOk(listNiches())
})
