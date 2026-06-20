// src/app/api/teams/[id]/runs/[runId]/preview/stop/route.ts
// Preview mode — "Parar": kill the kept-alive sandbox and mark the preview stopped.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { safeErrorMessage } from '@/lib/api-response'
import { killPreviewSandbox } from '@/lib/orchestration/team/preview-lifecycle'

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

    await killPreviewSandbox(run.sandboxId)
    await prisma.teamRun.update({ where: { id: runId }, data: { previewStatus: 'stopped', previewUrl: null } })

    return NextResponse.json({ success: true, data: { previewStatus: 'stopped' } })
  } catch (error) {
    return NextResponse.json({ success: false, error: safeErrorMessage(error, 'Failed to stop preview') }, { status: 500 })
  }
}
