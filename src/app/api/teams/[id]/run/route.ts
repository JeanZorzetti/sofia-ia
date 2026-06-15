// src/app/api/teams/[id]/run/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { startTeamRun, TeamRunError } from '@/lib/orchestration/team/start-team-run'

// The coordination loop runs in the background (after the response is flushed).
export const maxDuration = 300

const STATUS_BY_CODE: Record<string, number> = {
  not_found: 404,
  invalid_roster: 400,
  missing_mission: 400,
  queue_unavailable: 503,
}

// POST /api/teams/[id]/run — create a run and execute it in the background.
// Returns { runId } immediately; clients follow progress via the SSE stream.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const body = await request.json()

    const result = await startTeamRun(id, {
      mission: body?.mission,
      mode: body?.mode === 'code' ? 'code' : 'chat',
      userId: auth.id,
      repoUrl: body?.repoUrl,
      base: body?.base,
    })

    return NextResponse.json(
      { success: true, data: { runId: result.runId, status: 'pending', mode: result.mode } },
      { status: 202 },
    )
  } catch (error: unknown) {
    if (error instanceof TeamRunError) {
      return NextResponse.json({ success: false, error: error.message }, { status: STATUS_BY_CODE[error.code] ?? 400 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to run team'
    console.error('Error running team:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
