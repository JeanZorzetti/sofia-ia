// src/app/api/teams/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createTeamWithRoster } from '@/lib/orchestration/team/create-team'
import { withAuth } from '@/lib/with-auth'
import { parseJson, createTeamSchema } from '@/lib/validation'

// GET /api/teams — list the current user's teams
export const GET = withAuth(async (request, auth) => {
  try {
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
})

// POST /api/teams — create a team with a roster
export const POST = withAuth(async (request, auth) => {
  try {
    const parsed = await parseJson(request, createTeamSchema)
    if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })
    const { name, description, config, members } = parsed.data

    const result = await createTeamWithRoster({ name, description, config, members, userId: auth.id })
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 400 })

    return NextResponse.json({ success: true, data: result.team })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create team'
    console.error('Error creating team:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
})
