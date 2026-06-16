import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromApiKey } from '@/lib/api-key-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/public/teams
 * Lista os times do usuário autenticado via X-API-Key.
 */
export async function GET(request: NextRequest) {
  const user = await getUserFromApiKey(request)
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing API key. Pass your key in the X-API-Key header.' },
      { status: 401 },
    )
  }

  const teams = await prisma.team.findMany({
    where: { createdBy: user.id },
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

  return NextResponse.json({ success: true, data: teams, meta: { count: teams.length } })
}
