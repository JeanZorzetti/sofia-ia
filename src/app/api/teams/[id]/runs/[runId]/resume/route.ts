// 008-team-run-resilience — POST /api/teams/[id]/runs/[runId]/resume
// Retomada MANUAL de um TeamRun esgotado (rate_limited): valida ownership, reseta o run
// (atômico) e re-dispara o coordinator (que relê o board). Coordinator intocado.
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { apiOk, apiError, apiNotFound } from '@/lib/api-response'
import { resetRunForResume } from '@/lib/orchestration/team/team-resilience'
import { dispatchTeamRun } from '@/lib/orchestration/team/team-dispatch'

type RouteParams = { params: Promise<{ id: string; runId: string }> }

export const POST = withAuth(async (_request, auth, { params }: RouteParams) => {
  try {
    const { id, runId } = await params

    // Ownership: o run pertence a um Team do usuário (padrão das rotas de teams/runs).
    const run = await prisma.teamRun.findFirst({
      where: { id: runId, teamId: id, team: { createdBy: auth.id } },
      select: { id: true, status: true },
    })
    if (!run) return apiNotFound('Execução não encontrada')
    if (run.status !== 'rate_limited') {
      return apiError(`Apenas execuções bloqueadas por limite podem ser retomadas (status atual: "${run.status}").`, 409)
    }

    // Reset atômico (guarda de concorrência): só prossegue se ainda 'rate_limited'.
    const ok = await resetRunForResume(runId)
    if (!ok) return apiError('Execução não está mais bloqueada (talvez já retomada).', 409)

    await dispatchTeamRun(runId)
    return apiOk({ runId, resumed: true }, { status: 202 })
  } catch (error) {
    console.error('Error resuming team run:', error)
    return apiError('Failed to resume team run', 500)
  }
})
