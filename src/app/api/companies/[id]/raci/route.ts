// 005-agentic-companies — GET + PUT /api/companies/[id]/raci
// PUT impõe a regra de ouro (1 A/fase) via validateRaci → 409 na violação (FR-010).
import { withAuth } from '@/lib/with-auth'
import { ownerId } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { apiOk, apiError, apiNotFound } from '@/lib/api-response'
import { parseJson, putRaciSchema } from '@/lib/validation'
import { validateRaci, type RaciMatrix } from '@/lib/companies/raci'
import { SDLC_PHASES } from '@/lib/companies/sdlc'

type RouteParams = { params: Promise<{ id: string }> }

export const GET = withAuth(async (request, auth, { params }: RouteParams) => {
  try {
    const { id } = await params
    const company = await prisma.company.findFirst({
      where: { id, createdBy: ownerId(auth) },
      select: { raci: true, roles: { select: { key: true, title: true, layer: true }, orderBy: [{ layer: 'asc' }, { position: 'asc' }] } },
    })
    if (!company) return apiNotFound('Company not found')
    return apiOk({ raci: company.raci, phases: SDLC_PHASES, roles: company.roles })
  } catch (error) {
    console.error('Error fetching raci:', error)
    return apiError('Failed to fetch raci', 500)
  }
})

export const PUT = withAuth(async (request, auth, { params }: RouteParams) => {
  try {
    const { id } = await params
    const company = await prisma.company.findFirst({
      where: { id, createdBy: ownerId(auth) },
      select: { id: true, roles: { select: { key: true } } },
    })
    if (!company) return apiNotFound('Company not found')

    const parsed = await parseJson(request, putRaciSchema)
    if (!parsed.ok) return apiError(parsed.error, 400)

    const roleKeys = company.roles.map(r => r.key)
    const validationError = validateRaci(parsed.data.raci as RaciMatrix, roleKeys)
    if (validationError) return apiError(validationError, 409)

    const updated = await prisma.company.update({
      where: { id },
      data: { raci: parsed.data.raci as object },
      select: { raci: true },
    })
    return apiOk(updated)
  } catch (error) {
    console.error('Error updating raci:', error)
    return apiError('Failed to update raci', 500)
  }
})
