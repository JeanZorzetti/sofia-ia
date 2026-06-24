// 005-agentic-companies — POST /api/companies/[id]/clone (FR-019)
// Reproduz organograma + RACI numa nova empresa do MESMO dono; cargos nascem VAGOS
// (agentes não migram — 1:1 global + isolamento de tenant). Sem vazamento entre donos.
import { withAuth } from '@/lib/with-auth'
import { ownerId } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { apiOk, apiError, apiNotFound } from '@/lib/api-response'
import { parseJson, cloneCompanySchema } from '@/lib/validation'
import { cloneCompany } from '@/lib/companies/company-store'

type RouteParams = { params: Promise<{ id: string }> }

export const POST = withAuth(async (request, auth, { params }: RouteParams) => {
  try {
    const { id } = await params
    const source = await prisma.company.findFirst({
      where: { id, createdBy: ownerId(auth) },
      select: {
        niche: true, typology: true, raci: true,
        roles: { select: { key: true, title: true, layer: true, department: true, position: true } },
      },
    })
    if (!source) return apiNotFound('Company not found')

    const parsed = await parseJson(request, cloneCompanySchema)
    if (!parsed.ok) return apiError(parsed.error, 400)

    const clone = await cloneCompany(source, parsed.data.name, auth.id)
    return apiOk(clone, { status: 201 })
  } catch (error) {
    console.error('Error cloning company:', error)
    return apiError('Failed to clone company', 500)
  }
})
