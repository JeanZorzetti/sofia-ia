// 005-agentic-companies — GET (detalhe) + PATCH (nome/tipologia/desc) + DELETE /api/companies/[id]
import { withAuth } from '@/lib/with-auth'
import { ownerId } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { apiOk, apiError, apiNotFound } from '@/lib/api-response'
import { parseJson, patchCompanySchema } from '@/lib/validation'
import { getCompanyForOwner } from '@/lib/companies/company-store'
import { SDLC_PHASES } from '@/lib/companies/sdlc'

type RouteParams = { params: Promise<{ id: string }> }

// GET — detalhe completo: empresa + cargos (com agente) + RACI + fases do SDLC.
export const GET = withAuth(async (request, auth, { params }: RouteParams) => {
  try {
    const { id } = await params
    const company = await getCompanyForOwner(id, ownerId(auth))
    if (!company) return apiNotFound('Company not found')
    return apiOk({ company, roles: company.roles, raci: company.raci, sdlc: SDLC_PHASES })
  } catch (error) {
    console.error('Error fetching company:', error)
    return apiError('Failed to fetch company', 500)
  }
})

// PATCH — atualiza nome / tipologia / descrição (FR-008 tipologia).
export const PATCH = withAuth(async (request, auth, { params }: RouteParams) => {
  try {
    const { id } = await params
    const owned = await prisma.company.findFirst({ where: { id, createdBy: ownerId(auth) }, select: { id: true } })
    if (!owned) return apiNotFound('Company not found')

    const parsed = await parseJson(request, patchCompanySchema)
    if (!parsed.ok) return apiError(parsed.error, 400)
    const { name, typology, description } = parsed.data

    const company = await prisma.company.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        typology: typology !== undefined ? typology : undefined,
        description: description !== undefined ? description : undefined,
      },
    })
    return apiOk(company)
  } catch (error) {
    console.error('Error updating company:', error)
    return apiError('Failed to update company', 500)
  }
})

// DELETE — remove a empresa (cascade em cargos/runs; agentes NÃO são deletados).
export const DELETE = withAuth(async (request, auth, { params }: RouteParams) => {
  try {
    const { id } = await params
    const { count } = await prisma.company.deleteMany({ where: { id, createdBy: ownerId(auth) } })
    if (count === 0) return apiNotFound('Company not found')
    return apiOk({ deleted: true })
  } catch (error) {
    console.error('Error deleting company:', error)
    return apiError('Failed to delete company', 500)
  }
})
