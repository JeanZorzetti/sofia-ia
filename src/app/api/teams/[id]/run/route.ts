// src/app/api/teams/[id]/run/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

// Allow up to 5 minutes for the synchronous coordination loop.
export const maxDuration = 300

// POST /api/teams/[id]/run — create a run and execute it synchronously
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    const team = await prisma.team.findFirst({
      where: { id, createdBy: auth.id },
      include: { members: true },
    })
    if (!team) return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    if (!team.members.some(m => m.role === 'lead') || !team.members.some(m => m.role === 'worker')) {
      return NextResponse.json({ success: false, error: 'Roster inválido (precisa de Lead e Worker)' }, { status: 400 })
    }

    const body = await request.json()
    const mission = (body?.mission as string | undefined)?.trim()
    if (!mission) return NextResponse.json({ success: false, error: 'Missão é obrigatória' }, { status: 400 })

    const run = await prisma.teamRun.create({ data: { teamId: id, mission, status: 'pending' } })

    const { runTeam } = await import('@/lib/orchestration/team/team-coordinator')
    const { createPrismaTeamStore } = await import('@/lib/orchestration/team/team-store')
    const { chatWithAgent } = await import('@/lib/ai/groq')

    try {
      await runTeam(run.id, {
        store: createPrismaTeamStore(),
        chat: (agentId, messages, ctx) => chatWithAgent(agentId, messages as never, ctx),
      })
    } catch (err) {
      // runTeam already persisted status='failed'; log and continue to return the run.
      console.error('[Teams] run failed:', err)
    }

    const finalRun = await prisma.teamRun.findUnique({
      where: { id: run.id },
      include: { tasks: { orderBy: { position: 'asc' } }, messages: { orderBy: { createdAt: 'asc' } } },
    })
    return NextResponse.json({ success: true, data: finalRun })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to run team'
    console.error('Error running team:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
