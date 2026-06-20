// Teams V2.2 — S6: stream an image attachment from MinIO so the feed can render it.
// Auth + run ownership gated; the object key is validated against the run's messages
// so a user can only fetch keys that actually belong to a run they own.
import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { parseAttachments } from '@/lib/orchestration/team/team-attachments'
import { getAttachmentStream } from '@/lib/storage/minio'

// GET /api/teams/[id]/runs/[runId]/attachment?key=<objectKey>
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; runId: string }> }) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const { id, runId } = await params
    const key = request.nextUrl.searchParams.get('key') || ''
    if (!key) return NextResponse.json({ success: false, error: 'key obrigatória' }, { status: 400 })

    // Ownership + the key must belong to one of this run's messages (no arbitrary fetch).
    const run = await prisma.teamRun.findFirst({
      where: { id: runId, teamId: id, team: { createdBy: auth.id } },
      select: { id: true },
    })
    if (!run) return NextResponse.json({ success: false, error: 'Run not found' }, { status: 404 })

    const rows = await prisma.teamMessage.findMany({
      where: { runId },
      select: { attachments: true },
    })
    const keys = new Set(rows.flatMap(r => parseAttachments(r.attachments)).map(a => a.key))
    if (!keys.has(key)) return NextResponse.json({ success: false, error: 'Anexo não encontrado' }, { status: 404 })

    const { stream, mime } = await getAttachmentStream(key)
    const body = Readable.toWeb(stream) as unknown as ReadableStream
    return new NextResponse(body, {
      headers: { 'Content-Type': mime, 'Cache-Control': 'private, max-age=3600' },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch attachment'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
