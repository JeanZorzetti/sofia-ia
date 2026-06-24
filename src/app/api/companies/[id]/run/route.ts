// 005-agentic-companies — POST /api/companies/[id]/run
// Pré-valida a RACI (regra de ouro) e os cargos R/A das fases ESSENCIAIS preenchidos
// (senão 409 `blocked`, sem falha silenciosa). Cria a CompanyRun e dispara o
// meta-orquestrador via after() (assíncrono; cada fase chama runTeamAndWait).
import { after } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { ownerId } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { apiOk, apiError, apiNotFound } from '@/lib/api-response'
import { parseJson, runCompanySchema } from '@/lib/validation'
import { validateRaci, type RaciMatrix } from '@/lib/companies/raci'
import { buildPhaseRoster, type Staffing } from '@/lib/companies/phase-roster'
import { SDLC_PHASES } from '@/lib/companies/sdlc'
import { runCompany } from '@/lib/companies/company-run'

type RouteParams = { params: Promise<{ id: string }> }

export const POST = withAuth(async (request, auth, { params }: RouteParams) => {
  try {
    const { id } = await params
    const company = await prisma.company.findFirst({
      where: { id, createdBy: ownerId(auth) },
      include: { roles: true },
    })
    if (!company) return apiNotFound('Company not found')

    const parsed = await parseJson(request, runCompanySchema)
    if (!parsed.ok) return apiError(parsed.error, 400)

    const raci = (company.raci ?? {}) as RaciMatrix
    const roleKeys = company.roles.map(r => r.key)

    // 1) Regra de ouro da RACI.
    const raciError = validateRaci(raci, roleKeys)
    if (raciError) return apiError(raciError, 409)

    // 2) Cargos R/A das fases ESSENCIAIS preenchidos (não-essenciais podem ser puladas).
    const staffing: Staffing = {}
    for (const role of company.roles) if (role.agentId) staffing[role.key] = role.agentId
    for (const phase of SDLC_PHASES) {
      if (!phase.essential) continue
      const built = buildPhaseRoster(raci, phase.key, staffing)
      if (!built.ok) return apiError(`Execução bloqueada — ${built.error}`, 409)
    }

    const run = await prisma.companyRun.create({
      data: { companyId: id, mission: parsed.data.mission, status: 'pending', createdBy: auth.id },
    })

    // Dispara o meta-orquestrador após a resposta (não bloqueia o request).
    after(async () => {
      try { await runCompany(run.id) }
      catch (err) { console.error('[companies/run] runCompany falhou:', err) }
    })

    return apiOk({ companyRunId: run.id }, { status: 202 })
  } catch (error) {
    console.error('Error starting company run:', error)
    return apiError('Failed to start company run', 500)
  }
})
