import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromApiKey } from '@/lib/api-key-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/executions/[id]
 * Consulta o status de uma execução via API key.
 * Retorna: { id, status, output, createdAt, completedAt }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized. Provide a valid API key via Authorization: Bearer sk-...' }, { status: 401 })
  }

  const { id } = await params

  try {
    const execution = await prisma.orchestrationExecution.findUnique({
      where: { id },
      include: {
        orchestration: {
          select: { id: true, name: true, createdBy: true },
        },
      },
    })

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 })
    }

    // Verificar que a execução pertence ao usuário dono da chave
    if (execution.orchestration.createdBy !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      id: execution.id,
      orchestrationId: execution.orchestrationId,
      status: execution.status,
      output: execution.output,
      error: execution.error,
      tokensUsed: execution.tokensUsed,
      durationMs: execution.durationMs,
      createdAt: execution.createdAt,
      completedAt: execution.completedAt,
    })
  } catch (error: any) {
    console.error('[v1/executions] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
