// 009-usecase-squads — GET + POST /api/companies/[id]/squads
// GET  → lista squads da empresa (US2). POST → cria squad (US1).
// Todos withAuth + escopados por Company.createdBy == ownerId (IDOR → 404).
import { withAuth } from '@/lib/with-auth'
import { apiOk, apiError, apiNotFound } from '@/lib/api-response'
import { parseJson, createSquadSchema } from '@/lib/validation'
import { createSquad, listSquadsByCompany } from '@/lib/companies/squad-store'

type RouteParams = { params: Promise<{ id: string }> }

export const GET = withAuth(async (_request, auth, { params }: RouteParams) => {
  const { id } = await params
  const squads = await listSquadsByCompany(id, auth)
  if (squads === null) return apiNotFound('Company not found')
  return apiOk({ squads })
})

export const POST = withAuth(async (request, auth, { params }: RouteParams) => {
  const { id } = await params

  const parsed = await parseJson(request, createSquadSchema)
  if (!parsed.ok) return apiError(parsed.error, 400)

  const result = await createSquad(id, parsed.data, auth)
  if (!result.ok) {
    if (result.error === 'Empresa não encontrada') return apiNotFound('Company not found')
    return apiError(result.error, 400)
  }

  return apiOk({ squadId: result.squadId }, { status: 201 })
})
