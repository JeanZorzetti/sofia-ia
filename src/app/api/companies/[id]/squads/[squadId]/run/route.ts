// 009-usecase-squads — POST /api/companies/[id]/squads/[squadId]/run
// Enfileira o squad na fila global WIP=1 e dispara o dispatcher via after().
// Responde 202 com { runId, queued, position } — a execução ocorre em background.
import { after } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { apiOk, apiError, apiNotFound } from '@/lib/api-response'
import { parseJson, runSquadSchema } from '@/lib/validation'
import { resolveCompanyForOwner } from '@/lib/companies/squad-store'
import { enqueueSquadRun, getQueuePosition, dispatchSquadQueue } from '@/lib/companies/squad-queue'
import { prisma } from '@/lib/prisma'

type RouteParams = { params: Promise<{ id: string; squadId: string }> }

export const POST = withAuth(async (request, auth, { params }: RouteParams) => {
  const { id, squadId } = await params

  const ownedCompanyId = await resolveCompanyForOwner(id, auth)
  if (!ownedCompanyId) return apiNotFound('Company not found')

  // Verifica que o squad existe e pertence à empresa (IDOR → 404).
  const squad = await prisma.team.findFirst({
    where: { id: squadId, companyId: id, status: 'active' },
    select: { id: true },
  })
  if (!squad) return apiNotFound('Squad not found')

  const parsed = await parseJson(request, runSquadSchema)
  if (!parsed.ok) return apiError(parsed.error, 400)

  const runId = await enqueueSquadRun(squadId, parsed.data.mission)
  const position = await getQueuePosition(runId)
  const queued = position > 0

  // Dispara o dispatcher em background (não bloqueia o response).
  after(async () => {
    try { await dispatchSquadQueue() }
    catch (err) { console.error('[squads/run] dispatchSquadQueue falhou:', err) }
  })

  return apiOk({ runId, queued, position }, { status: 202 })
})
