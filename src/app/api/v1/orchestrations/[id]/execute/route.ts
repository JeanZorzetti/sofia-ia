import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromApiKey } from '@/lib/api-key-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/v1/orchestrations/[id]/execute
 * Executa uma orquestração via API key.
 * Body: { input?: string, variables?: Record<string, string> }
 * Retorna: { executionId, status: 'pending' }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized. Provide a valid API key via Authorization: Bearer sk-...' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json().catch(() => ({}))
    const { input, variables } = body

    // Verificar se a orquestração existe e pertence ao usuário
    const orchestration = await prisma.agentOrchestration.findFirst({
      where: { id, createdBy: auth.userId },
    })

    if (!orchestration) {
      return NextResponse.json({ error: 'Orchestration not found' }, { status: 404 })
    }

    if (orchestration.status !== 'active') {
      return NextResponse.json({ error: 'Orchestration is not active' }, { status: 400 })
    }

    // Criar registro de execução pendente
    const execution = await prisma.orchestrationExecution.create({
      data: {
        orchestrationId: id,
        input: { text: input || '', variables: variables || {} },
        status: 'pending',
      },
    })

    // Disparar execução em background (fire-and-forget via fetch interno)
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    // Iniciar execução de forma assíncrona
    fetch(`${baseUrl}/api/orchestrations/${id}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Passa o token do usuário dono da chave para a rota interna
        'x-internal-user-id': auth.userId,
        'x-internal-execution-id': execution.id,
      },
      body: JSON.stringify({
        input: input || '',
        variables: variables || {},
        executionId: execution.id,
      }),
    }).catch((err) => {
      console.error('[v1/execute] Background execution error:', err)
      // Marcar como failed se não conseguir iniciar
      prisma.orchestrationExecution.update({
        where: { id: execution.id },
        data: { status: 'failed', error: 'Failed to start execution' },
      }).catch(() => {})
    })

    return NextResponse.json(
      { executionId: execution.id, status: 'pending', orchestrationId: id },
      { status: 202 }
    )
  } catch (error: any) {
    console.error('[v1/orchestrations/execute] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
