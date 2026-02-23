import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateApiKey, getApiKeyFromRequest } from '@/lib/api-key'

export const dynamic = 'force-dynamic'

/**
 * GET /api/public/executions/:id
 * Retorna o status e resultado de uma execução de orquestração.
 *
 * Headers: X-API-Key: sk_...
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await authenticateApiKey(getApiKeyFromRequest(request))
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing API key.' },
      { status: 401 }
    )
  }

  const { id } = await params

  const execution = await prisma.orchestrationExecution.findFirst({
    where: {
      id,
      orchestration: { createdBy: user.id },
    },
    select: {
      id: true,
      orchestrationId: true,
      status: true,
      input: true,
      output: true,
      agentResults: true,
      error: true,
      durationMs: true,
      tokensUsed: true,
      estimatedCost: true,
      startedAt: true,
      completedAt: true,
    },
  })

  if (!execution) {
    return NextResponse.json(
      { success: false, error: 'Execution not found.' },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true, data: execution })
}
