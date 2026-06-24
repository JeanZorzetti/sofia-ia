// 007-company-run-resilience — POST /api/companies/[id]/runs/[runId]/resume
// Retomada MANUAL de uma CompanyRun bloqueada por limite de cota: valida ownership +
// status 'blocked', limpa o bloqueio e redispara o meta-orquestrador via after().
// runCompany é retomável (pula fases já concluídas). Coordinator intocado.
import { after } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { ownerId } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { apiOk, apiError, apiNotFound } from '@/lib/api-response'
import { runCompany } from '@/lib/companies/company-run'

type RouteParams = { params: Promise<{ id: string; runId: string }> }

export const POST = withAuth(async (_request, auth, { params }: RouteParams) => {
  try {
    const { id, runId } = await params

    // Ownership: a empresa pertence ao dono (admin → ownerId undefined → vê todas).
    const company = await prisma.company.findFirst({ where: { id, createdBy: ownerId(auth) }, select: { id: true } })
    if (!company) return apiNotFound('Company not found')

    const run = await prisma.companyRun.findFirst({ where: { id: runId, companyId: id }, select: { id: true, status: true } })
    if (!run) return apiNotFound('Execução não encontrada')

    // Só execuções BLOQUEADAS são retomáveis (evita dupla retomada / fases duplicadas).
    if (run.status !== 'blocked') {
      return apiError(`Apenas execuções bloqueadas podem ser retomadas (status atual: "${run.status}").`, 409)
    }

    // Marca running ANTES do dispatch (guarda de concorrência: uma 2ª chamada verá "running" → 409).
    await prisma.companyRun.update({ where: { id: runId }, data: { status: 'running', resetAt: null, error: null } })

    after(async () => {
      try { await runCompany(runId) }
      catch (err) { console.error('[companies/resume] runCompany falhou:', err) }
    })

    return apiOk({ companyRunId: runId, resumed: true }, { status: 202 })
  } catch (error) {
    console.error('Error resuming company run:', error)
    return apiError('Failed to resume company run', 500)
  }
})
