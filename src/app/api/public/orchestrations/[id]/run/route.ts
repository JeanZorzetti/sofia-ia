import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateApiKey, getApiKeyFromRequest } from '@/lib/api-key'

export const dynamic = 'force-dynamic'

/**
 * POST /api/public/orchestrations/:id/run
 * Executa uma orquestração via API pública.
 *
 * Headers: X-API-Key: sk_...
 * Body: { "input": "Sua mensagem aqui" }
 *
 * Returns: execution record com status pending (processamento é assíncrono)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await authenticateApiKey(getApiKeyFromRequest(request))
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing API key. Pass your key in the X-API-Key header.' },
      { status: 401 }
    )
  }

  const { id } = await params

  const orchestration = await prisma.agentOrchestration.findFirst({
    where: { id, createdBy: user.id, status: 'active' },
  })

  if (!orchestration) {
    return NextResponse.json(
      { success: false, error: 'Orchestration not found or does not belong to your account.' },
      { status: 404 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const input = body.input || body.message || ''

  if (!input) {
    return NextResponse.json(
      { success: false, error: 'Field "input" is required in the request body.' },
      { status: 400 }
    )
  }

  const execution = await prisma.orchestrationExecution.create({
    data: {
      orchestrationId: orchestration.id,
      status: 'pending',
      input: { message: input, source: 'api' },
    },
  })

  return NextResponse.json(
    {
      success: true,
      data: {
        executionId: execution.id,
        orchestrationId: orchestration.id,
        status: 'pending',
        message: 'Execution queued. Poll GET /api/public/executions/:id for status.',
        startedAt: execution.startedAt,
      },
    },
    { status: 202 }
  )
}
