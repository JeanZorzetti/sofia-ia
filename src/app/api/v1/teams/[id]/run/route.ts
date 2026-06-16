import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromApiKey } from '@/lib/api-key-auth'
import { startTeamRun, TeamRunError } from '@/lib/orchestration/team/start-team-run'
import { parseTeamRunBody, TEAM_RUN_STATUS_BY_CODE } from '@/lib/orchestration/team/team-run-api'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/v1/teams/[id]/run
 * Dispara um Team run via API key (Authorization: Bearer sk-...).
 * Body: { mission | input | message, mode?: 'chat' | 'code' }
 * Retorna: 202 { success, data: { runId, status, mode } }. Resultado via output webhook do time.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthFromApiKey(request)
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized. Provide a valid API key via Authorization: Bearer sk-...' },
      { status: 401 },
    )
  }

  const { id } = await params

  try {
    const body = await request.json().catch(() => ({}))
    const result = await startTeamRun(id, { ...parseTeamRunBody(body), userId: auth.userId })
    return NextResponse.json(
      { success: true, data: { runId: result.runId, status: 'pending', mode: result.mode } },
      { status: 202 },
    )
  } catch (error: unknown) {
    if (error instanceof TeamRunError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: TEAM_RUN_STATUS_BY_CODE[error.code] ?? 400 },
      )
    }
    console.error('[v1/teams/run] POST error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
