// 005-agentic-companies — GET + PUT (add/remove cargos, FR-005) /api/companies/[id]/roles
import { withAuth } from '@/lib/with-auth'
import { ownerId } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { apiOk, apiError, apiNotFound } from '@/lib/api-response'
import { parseJson, putRolesSchema } from '@/lib/validation'

type RouteParams = { params: Promise<{ id: string }> }

async function loadOwned(id: string, owner: string | undefined) {
  return prisma.company.findFirst({
    where: { id, createdBy: owner },
    select: { id: true, raci: true },
  })
}

// GET — cargos da empresa (agrupáveis por layer pelo cliente).
export const GET = withAuth(async (request, auth, { params }: RouteParams) => {
  try {
    const { id } = await params
    const owned = await loadOwned(id, ownerId(auth))
    if (!owned) return apiNotFound('Company not found')
    const roles = await prisma.companyRole.findMany({
      where: { companyId: id },
      orderBy: [{ layer: 'asc' }, { position: 'asc' }],
      include: { agent: { select: { id: true, name: true, model: true, status: true } } },
    })
    return apiOk(roles)
  } catch (error) {
    console.error('Error listing roles:', error)
    return apiError('Failed to list roles', 500)
  }
})

// PUT — adiciona e/ou remove cargos além do template do nicho.
// 409 se remover um cargo ainda referenciado pela RACI (limpar a RACI antes).
export const PUT = withAuth(async (request, auth, { params }: RouteParams) => {
  try {
    const { id } = await params
    const owned = await loadOwned(id, ownerId(auth))
    if (!owned) return apiNotFound('Company not found')

    const parsed = await parseJson(request, putRolesSchema)
    if (!parsed.ok) return apiError(parsed.error, 400)
    const { add, removeKeys } = parsed.data

    if (removeKeys && removeKeys.length > 0) {
      const raci = (owned.raci ?? {}) as Record<string, Record<string, string>>
      const referenced = removeKeys.filter(k => Object.values(raci).some(phase => k in phase))
      if (referenced.length > 0) {
        return apiError(`Cargos ainda referenciados pela RACI: ${referenced.join(', ')}. Limpe a RACI antes de remover.`, 409)
      }
      await prisma.companyRole.deleteMany({ where: { companyId: id, key: { in: removeKeys } } })
    }

    if (add && add.length > 0) {
      // Posição: após o maior position da camada destino.
      const existing = await prisma.companyRole.findMany({ where: { companyId: id }, select: { key: true, layer: true, position: true } })
      const dupes = add.filter(a => existing.some(e => e.key === a.key))
      if (dupes.length > 0) return apiError(`Cargos já existem: ${dupes.map(d => d.key).join(', ')}`, 409)
      await prisma.companyRole.createMany({
        data: add.map(a => {
          const maxPos = Math.max(-1, ...existing.filter(e => e.layer === a.layer).map(e => e.position))
          return { companyId: id, key: a.key, title: a.title, layer: a.layer, department: a.department ?? null, position: maxPos + 1 }
        }),
      })
    }

    const roles = await prisma.companyRole.findMany({
      where: { companyId: id },
      orderBy: [{ layer: 'asc' }, { position: 'asc' }],
      include: { agent: { select: { id: true, name: true, model: true, status: true } } },
    })
    return apiOk(roles)
  } catch (error) {
    console.error('Error updating roles:', error)
    return apiError('Failed to update roles', 500)
  }
})
