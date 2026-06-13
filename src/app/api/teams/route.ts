// src/app/api/teams/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { validateRoster, type RosterInput } from '@/lib/orchestration/team/team-roster'

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
    if (!name?.trim()) return NextResponse.json({ success: false, error: 'Nome é obrigatório' }, { status: 400 })

    const rosterError = validateRoster(members ?? [])
    if (rosterError) return NextResponse.json({ success: false, error: rosterError }, { status: 400 })

    // Verify all referenced agents belong to the user.
    const agentIds = [...new Set((members ?? []).map(m => m.agentId))]
    const owned = await prisma.agent.count({ where: { id: { in: agentIds }, createdBy: auth.id } })
    if (owned !== agentIds.length) {
      return NextResponse.json({ success: false, error: 'Algum agente não pertence a você' }, { status: 400 })
    }

    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        description: description ?? null,
        config: (config ?? {}) as object,
        createdBy: auth.id,
        members: {
          create: (members ?? []).map((m, i) => ({
            agentId: m.agentId,
            role: m.role,
            model: m.model ?? null,
            effort: m.effort ?? null,
            position: m.position ?? i,
          })),
        },
      },
      include: { members: { include: { agent: { select: { name: true } } }, orderBy: { position: 'asc' } } },
    })
    return NextResponse.json({ success: true, data: team })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create team'
    console.error('Error creating team:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
