// src/app/api/teams/[id]/run/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { safeErrorMessage } from '@/lib/api-response'
import { getAuthFromRequest } from '@/lib/auth'
import { startTeamRun, TeamRunError } from '@/lib/orchestration/team/start-team-run'
import { TEAM_RUN_STATUS_BY_CODE } from '@/lib/orchestration/team/team-run-api'
import { uploadImagesFromForm } from '@/lib/orchestration/team/upload-attachments'
import type { TeamAttachment } from '@/lib/orchestration/team/team-attachments'

// The coordination loop runs in the background (after the response is flushed).
export const maxDuration = 300

// POST /api/teams/[id]/run — create a run and execute it in the background.
// Returns { runId } immediately; clients follow progress via the SSE stream.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    // S6: the UI sends multipart/form-data when the mission carries images; the JSON
    // body stays the path for programmatic callers (no images). Both shapes share fields.
    let body: Record<string, unknown>
    let attachments: TeamAttachment[] = []
    if (request.headers.get('content-type')?.includes('multipart/form-data')) {
      const form = await request.formData()
      body = {
        mission: form.get('mission'),
        mode: form.get('mode'),
        repoUrl: form.get('repoUrl'),
        base: form.get('base'),
        gitMode: form.get('gitMode'),
        previewEnabled: form.get('previewEnabled'),
        continueFromRunId: form.get('continueFromRunId'),
      }
      attachments = await uploadImagesFromForm(id, form)
    } else {
      body = await request.json()
    }

    const result = await startTeamRun(id, {
      mission: body?.mission as string,
      mode: body?.mode === 'code' ? 'code' : 'chat',
      userId: auth.id,
      repoUrl: body?.repoUrl as string | undefined,
      base: body?.base as string | undefined,
      gitMode: body?.gitMode as string | undefined, // S3.1: sanitized in startTeamRun (only 'direct' | null persists)
      previewEnabled: body?.previewEnabled === true || body?.previewEnabled === 'true', // Preview mode (gated to code-run + repo in startTeamRun)
      continueFromRunId: (typeof body?.continueFromRunId === 'string' && body.continueFromRunId) ? body.continueFromRunId : undefined, // Lovable-style iteration
      attachments,
    })

    return NextResponse.json(
      { success: true, data: { runId: result.runId, status: 'pending', mode: result.mode } },
      { status: 202 },
    )
  } catch (error: unknown) {
    if (error instanceof TeamRunError) {
      return NextResponse.json({ success: false, error: error.message }, { status: TEAM_RUN_STATUS_BY_CODE[error.code] ?? 400 })
    }
    const msg = safeErrorMessage(error, 'Failed to run team')
    console.error('Error running team:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
