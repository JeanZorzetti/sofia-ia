import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromApiKey } from '@/lib/api-key-auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

/**
 * POST /api/v1/integrations/zapier/execute
 *
 * Execute an orchestration via Zapier action.
 * Authentication: x-api-key header or Bearer token.
 *
 * Body: { orchestrationId: string, input?: string }
 * Response: { executionId, status }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromApiKey(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing API key' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { orchestrationId, input } = body

    if (!orchestrationId || typeof orchestrationId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'orchestrationId is required' },
        { status: 400 }
      )
    }

    // Verify orchestration belongs to user
    const orchestration = await prisma.agentOrchestration.findFirst({
      where: { id: orchestrationId, createdBy: auth.userId },
    })

    if (!orchestration) {
      return NextResponse.json(
        { success: false, error: 'Orchestration not found' },
        { status: 404 }
      )
    }

    // Create execution record
    const execution = await prisma.orchestrationExecution.create({
      data: {
        orchestrationId,
        status: 'pending',
        input: { text: input || '', source: 'zapier' },
        agentResults: [],
      },
    })

    // Fire actual execution asynchronously via internal API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sofiaia.roilabs.com.br'
    fetch(`${baseUrl}/api/orchestrations/${orchestrationId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Use internal auth — pass execution ID for tracking
        'x-internal-execution-id': execution.id,
      },
      body: JSON.stringify({
        input: input || '',
        executionId: execution.id,
        source: 'zapier',
      }),
    }).catch((err) => {
      console.error('[zapier/execute] Async execution fire failed:', err)
    })

    logAudit(
      auth.userId,
      'orchestration.executed',
      'orchestration',
      orchestrationId,
      { source: 'zapier', executionId: execution.id }
    )

    return NextResponse.json({
      success: true,
      executionId: execution.id,
      status: 'pending',
      orchestrationName: orchestration.name,
    })
  } catch (error) {
    console.error('[zapier/execute] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to execute orchestration' },
      { status: 500 }
    )
  }
}
