// src/app/api/teams/[id]/run/route.ts
import { NextRequest, NextResponse, after } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

// The coordination loop runs in the background (after the response is flushed).
// maxDuration still caps the post-response work on platforms that enforce it;
// on the EasyPanel Docker server it is effectively unbounded.
export const maxDuration = 300

// POST /api/teams/[id]/run — create a run and execute it in the background.
// Returns { runId } immediately; clients follow progress via the SSE stream.
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

    // Execute the coordinator AFTER the response is sent. The coordinator writes
    // every board/message/status transition to the DB, so the SSE stream reflects
    // progress live. No durable queue yet — orphaned runs (process restart) are
    // reconciled by TTL on read (see team-reconcile.ts).
    after(async () => {
      try {
        const { runTeam } = await import('@/lib/orchestration/team/team-coordinator')
        const { createPrismaTeamStore } = await import('@/lib/orchestration/team/team-store')
        const { chatWithAgent } = await import('@/lib/ai/groq')
        await runTeam(run.id, {
          store: createPrismaTeamStore(),
          chat: (agentId, messages, ctx, opts) => chatWithAgent(agentId, messages as never, ctx, opts),
        })
      } catch (err) {
        // runTeam already persisted status='failed' on throw; this is a log net.
        console.error('[Teams] background run failed:', err)
      }
    })

    return NextResponse.json({ success: true, data: { runId: run.id, status: 'pending' } }, { status: 202 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to run team'
    console.error('Error running team:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
