// 005-agentic-companies — GET /api/companies/[id]/runs (execuções da empresa)
import { withAuth } from '@/lib/with-auth'
import { ownerId } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { apiOk, apiError, apiNotFound } from '@/lib/api-response'

type RouteParams = { params: Promise<{ id: string }> }

export const GET = withAuth(async (request, auth, { params }: RouteParams) => {
  try {
    const { id } = await params
    const company = await prisma.company.findFirst({ where: { id, createdBy: ownerId(auth) }, select: { id: true } })
    if (!company) return apiNotFound('Company not found')

    const runs = await prisma.companyRun.findMany({
      where: { companyId: id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { phaseRuns: true } } },
    })
    return apiOk(runs)
  } catch (error) {
    console.error('Error listing company runs:', error)
    return apiError('Failed to list runs', 500)
  }
})
