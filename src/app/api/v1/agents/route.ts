import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromApiKey } from '@/lib/api-key-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/agents
 * Lista agentes do tenant autenticado via API key.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized. Provide a valid API key via Authorization: Bearer sk-...' }, { status: 401 })
  }

  try {
    const agents = await prisma.agent.findMany({
      where: { createdBy: auth.userId, status: 'active' },
      select: {
        id: true,
        name: true,
        description: true,
        model: true,
        status: true,
        memoryEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: agents, total: agents.length })
  } catch (error: any) {
    console.error('[v1/agents] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
