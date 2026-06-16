import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromApiKey } from '@/lib/api-key-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/teams
 * Lista os times do tenant autenticado via API key (Authorization: Bearer sk-...).
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromApiKey(request)
  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide a valid API key via Authorization: Bearer sk-...' },
      { status: 401 },
    )
  }

  try {
    const teams = await prisma.team.findMany({
      where: { createdBy: auth.userId },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ data: teams, total: teams.length })
  } catch (error: unknown) {
    console.error('[v1/teams] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
