// src/app/api/teams/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { type RosterInput } from '@/lib/orchestration/team/team-roster'
import { createTeamWithRoster } from '@/lib/orchestration/team/create-team'

// GET /api/teams — list the current user's teams
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const teams = await prisma.team.findMany({
      where: { createdBy: auth.id, status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: {
        members: { include: { agent: { select: { name: true } } }, orderBy: { position: 'asc' } },
        _count: { select: { runs: true } },
      },
    })
    return NextResponse.json({ success: true, data: teams })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to list teams'
    console.error('Error listing teams:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// POST /api/teams — create a team with a roster
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, description, config, members } = body as {
      name?: string; description?: string; config?: Record<string, unknown>; members?: RosterInput[]
    }

    const result = await createTeamWithRoster({ name, description, config, members, userId: auth.id })
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 400 })

    return NextResponse.json({ success: true, data: result.team })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create team'
    console.error('Error creating team:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
