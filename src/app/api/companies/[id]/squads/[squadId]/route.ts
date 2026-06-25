// 009-usecase-squads — GET + PATCH + DELETE /api/companies/[id]/squads/[squadId]
// GET    → detalhe do squad. PATCH → edita nome/useCase/membros. DELETE → remove.
// Todos withAuth + escopados por dono (empresa de outro dono → 404).
import { withAuth } from '@/lib/with-auth'
import { apiOk, apiError, apiNotFound } from '@/lib/api-response'
import { parseJson, patchSquadSchema } from '@/lib/validation'
import { getSquadForOwner, patchSquad, deleteSquad } from '@/lib/companies/squad-store'

type RouteParams = { params: Promise<{ id: string; squadId: string }> }

export const GET = withAuth(async (_request, auth, { params }: RouteParams) => {
  const { id, squadId } = await params
  const squad = await getSquadForOwner(id, squadId, auth)
  if (!squad) return apiNotFound('Squad not found')
  return apiOk({ squad })
})

export const PATCH = withAuth(async (request, auth, { params }: RouteParams) => {
  const { id, squadId } = await params

  const parsed = await parseJson(request, patchSquadSchema)
  if (!parsed.ok) return apiError(parsed.error, 400)

  const result = await patchSquad(id, squadId, parsed.data, auth)
  if (!result.ok) {
    if (result.error === 'Empresa não encontrada' || result.error === 'Squad não encontrado') {
      return apiNotFound(result.error)
    }
    return apiError(result.error, 400)
  }

  return apiOk({ squad: result.squad })
})

export const DELETE = withAuth(async (_request, auth, { params }: RouteParams) => {
  const { id, squadId } = await params
  const result = await deleteSquad(id, squadId, auth)
  if (!result.ok) return apiNotFound(result.error)
  return apiOk({ deleted: true })
})
