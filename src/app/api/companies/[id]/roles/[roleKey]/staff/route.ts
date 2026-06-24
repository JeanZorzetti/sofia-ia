// 005-agentic-companies — POST (encaixar) + DELETE (desencaixar) agente num cargo.
// Impõe a relação 1:1 (FR-003a) e valida ownership do agente (multi-tenant).
import { withAuth } from '@/lib/with-auth'
import { ownerId } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { apiOk, apiError, apiNotFound } from '@/lib/api-response'
import { parseJson, staffRoleSchema } from '@/lib/validation'

type RouteParams = { params: Promise<{ id: string; roleKey: string }> }

// POST — encaixa um agente existente no cargo. 1:1: agente já alocado → 409; agente de
// outro dono / inexistente → 404. Substituir o ocupante atual é permitido (sobrescreve).
export const POST = withAuth(async (request, auth, { params }: RouteParams) => {
  try {
    const { id, roleKey } = await params
    const owner = ownerId(auth)

    // Empresa do dono + cargo existente.
    const company = await prisma.company.findFirst({ where: { id, createdBy: owner }, select: { id: true } })
    if (!company) return apiNotFound('Company not found')
    const role = await prisma.companyRole.findUnique({ where: { companyId_key: { companyId: id, key: roleKey } }, select: { id: true } })
    if (!role) return apiNotFound('Cargo não encontrado')

    const parsed = await parseJson(request, staffRoleSchema)
    if (!parsed.ok) return apiError(parsed.error, 400)
    const { agentId } = parsed.data

    // O agente precisa pertencer ao dono (anti-IDOR de tenant).
    const agent = await prisma.agent.findFirst({ where: { id: agentId, createdBy: owner }, select: { id: true } })
    if (!agent) return apiNotFound('Agente inexistente ou de outro dono')

    // 1:1 global: o agente não pode estar em outro cargo (qualquer empresa).
    const occupied = await prisma.companyRole.findUnique({ where: { agentId }, select: { id: true } })
    if (occupied && occupied.id !== role.id) {
      return apiError('Agente já ocupa outro cargo', 409)
    }

    const updated = await prisma.companyRole.update({
      where: { id: role.id },
      data: { agentId },
      include: { agent: { select: { id: true, name: true, model: true, status: true } } },
    })
    return apiOk(updated)
  } catch (error) {
    console.error('Error staffing role:', error)
    return apiError('Failed to staff role', 500)
  }
})

// DELETE — desencaixa (cargo volta a vago). Não afeta o agente.
export const DELETE = withAuth(async (request, auth, { params }: RouteParams) => {
  try {
    const { id, roleKey } = await params
    const company = await prisma.company.findFirst({ where: { id, createdBy: ownerId(auth) }, select: { id: true } })
    if (!company) return apiNotFound('Company not found')

    const { count } = await prisma.companyRole.updateMany({
      where: { companyId: id, key: roleKey },
      data: { agentId: null },
    })
    if (count === 0) return apiNotFound('Cargo não encontrado')
    return apiOk({ unstaffed: true })
  } catch (error) {
    console.error('Error unstaffing role:', error)
    return apiError('Failed to unstaff role', 500)
  }
})
