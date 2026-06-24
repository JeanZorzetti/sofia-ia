// 005-agentic-companies — GET /api/company-runs/[id]
// Status fase-a-fase de uma execução (FR-016): cada CompanyPhaseRun com status,
// outputArtifact e teamRunId (link para o TeamRun real e suas tasks/messages).
import { withAuth } from '@/lib/with-auth'
import { ownerId } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { apiOk, apiError, apiNotFound } from '@/lib/api-response'

type RouteParams = { params: Promise<{ id: string }> }

export const GET = withAuth(async (request, auth, { params }: RouteParams) => {
  try {
    const { id } = await params
    const run = await prisma.companyRun.findFirst({
      where: { id, createdBy: ownerId(auth) },
      include: { phaseRuns: { orderBy: { position: 'asc' } } },
    })
    if (!run) return apiNotFound('Run not found')
    const { phaseRuns, ...rest } = run
    return apiOk({ run: rest, phaseRuns })
  } catch (error) {
    console.error('Error fetching company run:', error)
    return apiError('Failed to fetch run', 500)
  }
})
