import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromApiKey } from '@/lib/api-key-auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/v1/integrations/zapier/poll
 *
 * Zapier polling endpoint — returns last 10 completed orchestration executions.
 * Authentication: x-api-key header or Bearer token.
 *
 * Response format follows Zapier polling trigger conventions:
 * Array of objects with an `id` field.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromApiKey(request)
    if (!auth) {
      return NextResponse.json(
        [{ id: 'auth-error', error: 'Invalid or missing API key' }],
        { status: 401 }
      )
    }

    // Zapier polling: get last 10 completed executions for this user
    const executions = await prisma.orchestrationExecution.findMany({
      where: {
        status: { in: ['completed', 'failed'] },
        orchestration: { createdBy: auth.userId },
      },
      include: {
        orchestration: {
          select: { id: true, name: true },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
    })

    // Zapier requires an `id` field and prefers ISO timestamps
    const data = executions.map((exec) => ({
      id: exec.id,
      timestamp: exec.completedAt?.toISOString() || exec.startedAt.toISOString(),
      orchestrationId: exec.orchestrationId,
      orchestrationName: exec.orchestration.name,
      status: exec.status,
      durationMs: exec.durationMs,
      tokensUsed: exec.tokensUsed,
      output: exec.output,
      error: exec.error || null,
      startedAt: exec.startedAt.toISOString(),
      completedAt: exec.completedAt?.toISOString() || null,
    }))

    // Zapier polling returns an array directly (not wrapped in object)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[zapier/poll] GET error:', error)
    return NextResponse.json(
      [{ id: 'server-error', error: 'Internal server error' }],
      { status: 500 }
    )
  }
}
