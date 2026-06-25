// 009-usecase-squads — encerrar um squad-run (pending/running/rate_limited).
// Escopado por Company.createdBy == ownerId(auth) (IDOR → 404). Após cancelar,
// drena o próximo da fila (libera o slot WIP=1).
import { after } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { apiOk, apiError } from '@/lib/api-response'
import { cancelSquadRun, dispatchSquadQueue } from '@/lib/companies/squad-queue'
import type { JWTPayload } from '@/lib/auth'

interface RouteParams { params: Promise<{ runId: string }> }

export const DELETE = withAuth(async (_request, auth: JWTPayload, { params }: RouteParams) => {
  const { runId } = await params
  const result = await cancelSquadRun(runId, auth)
  if (!result.ok) return apiError(result.error, result.status)

  // Libera o slot WIP=1 e puxa o próximo pending (no-op se nada a fazer).
  after(async () => {
    try { await dispatchSquadQueue() } catch (err) { console.error('[squad-runs/cancel] dispatch falhou:', err) }
  })

  return apiOk({ runId, status: 'cancelled' })
})
