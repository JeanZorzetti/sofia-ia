import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey, getApiKeyFromRequest } from '@/lib/api-key'
import { startTeamRun, TeamRunError } from '@/lib/orchestration/team/start-team-run'
import { parseTeamRunBody, TEAM_RUN_STATUS_BY_CODE } from '@/lib/orchestration/team/team-run-api'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/public/teams/:id/run
 * Dispara um Team run via API pública (X-API-Key: sk_...).
 * Body: { mission | input | message, mode?: 'chat' | 'code' }
 * Retorna: 202 { success, data: { runId, status, mode } }. Resultado via output webhook do time.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateApiKey(getApiKeyFromRequest(request))
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing API key. Pass your key in the X-API-Key header.' },
      { status: 401 },
    )
  }

  const { id } = await params

  try {
    const body = await request.json().catch(() => ({}))
    const result = await startTeamRun(id, { ...parseTeamRunBody(body), userId: user.id })
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
    console.error('[public/teams/run] POST error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
