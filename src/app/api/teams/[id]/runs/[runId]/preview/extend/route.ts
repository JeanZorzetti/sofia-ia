// src/app/api/teams/[id]/runs/[runId]/preview/extend/route.ts
// Preview mode — "Estender +15min": push the E2B sandbox timeout out by a full TTL and
// bump previewExpiresAt. Only valid while the preview is live.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { safeErrorMessage } from '@/lib/api-response'
import { PREVIEW_TTL_MS } from '@/lib/orchestration/team/preview-server'
import { extendPreviewSandbox } from '@/lib/orchestration/team/preview-lifecycle'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; runId: string }> }) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const { id, runId } = await params

    const run = await prisma.teamRun.findFirst({
      where: { id: runId, teamId: id, team: { createdBy: auth.id } },
      select: { previewStatus: true, sandboxId: true },
    })
    if (!run) return NextResponse.json({ success: false, error: 'Run not found' }, { status: 404 })
    if (run.previewStatus !== 'live' || !run.sandboxId) {
      return NextResponse.json({ success: false, error: 'Preview não está ativo' }, { status: 409 })
    }

    await extendPreviewSandbox(run.sandboxId)
    const previewExpiresAt = new Date(Date.now() + PREVIEW_TTL_MS)
    await prisma.teamRun.update({ where: { id: runId }, data: { previewExpiresAt } })

    return NextResponse.json({ success: true, data: { previewExpiresAt } })
  } catch (error) {
    return NextResponse.json({ success: false, error: safeErrorMessage(error, 'Failed to extend preview') }, { status: 500 })
  }
}
