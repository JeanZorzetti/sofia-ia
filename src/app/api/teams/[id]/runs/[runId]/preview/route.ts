// src/app/api/teams/[id]/runs/[runId]/preview/route.ts
// Preview mode — source of truth for the PreviewPanel (polled independently of the run
// SSE stream, which closes ~45s after the run ends while the preview lives for ~15min).
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { safeErrorMessage } from '@/lib/api-response'
import { killPreviewSandbox } from '@/lib/orchestration/team/preview-lifecycle'

export const dynamic = 'force-dynamic'

// GET — current preview state. Lazy-expiry: if a 'live' preview is past its TTL, mark it
// 'expired' and best-effort kill the sandbox here, so the UI is correct even if the cron
// reaper hasn't run yet.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; runId: string }> }) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const { id, runId } = await params

    const run = await prisma.teamRun.findFirst({
      where: { id: runId, teamId: id, team: { createdBy: auth.id } },
      select: { status: true, previewEnabled: true, previewStatus: true, previewUrl: true, previewExpiresAt: true, sandboxId: true },
    })
    if (!run) return NextResponse.json({ success: false, error: 'Run not found' }, { status: 404 })

    let { previewStatus, previewUrl } = run
    if (previewStatus === 'live' && run.previewExpiresAt && run.previewExpiresAt.getTime() < Date.now()) {
      await killPreviewSandbox(run.sandboxId)
      await prisma.teamRun.update({ where: { id: runId }, data: { previewStatus: 'expired', previewUrl: null } }).catch(() => {})
      previewStatus = 'expired'
      previewUrl = null
    }

    return NextResponse.json({
      success: true,
      data: {
        runStatus: run.status,
        previewEnabled: run.previewEnabled,
        previewStatus,
        previewUrl,
        previewExpiresAt: run.previewExpiresAt,
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: safeErrorMessage(error, 'Failed to read preview') }, { status: 500 })
  }
}
