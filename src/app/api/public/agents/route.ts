import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateApiKey, getApiKeyFromRequest } from '@/lib/api-key'

export const dynamic = 'force-dynamic'

/**
 * GET /api/public/agents
 * Lista os agentes ativos do usuário autenticado via X-API-Key.
 *
 * Headers: X-API-Key: sk_...
 */
export async function GET(request: NextRequest) {
  const user = await authenticateApiKey(getApiKeyFromRequest(request))
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing API key. Pass your key in the X-API-Key header.' },
      { status: 401 }
    )
  }

  const agents = await prisma.agent.findMany({
    where: { userId: user.id, status: 'active' },
    select: {
      id: true,
      name: true,
      description: true,
      model: true,
      temperature: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    success: true,
    data: agents,
    meta: { count: agents.length },
  })
}
