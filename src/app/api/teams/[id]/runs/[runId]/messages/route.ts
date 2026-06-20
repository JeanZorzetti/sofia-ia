// src/app/api/teams/[id]/runs/[runId]/messages/route.ts
// V2.2 S4 — inject a steering message into a LIVE run. The Lead surfaces it in its
// next planning turn (cooperative steering); it never interrupts a call in flight.
// Migration-free: writes a `TeamMessage` with kind='user' (the column is a free String).
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { uploadImagesFromForm } from '@/lib/orchestration/team/upload-attachments'
import { materializeRunAttachments } from '@/lib/orchestration/team/materialize-attachments'
import type { TeamAttachment } from '@/lib/orchestration/team/team-attachments'

const MAX_CONTENT = 2000

// Only a run that hasn't terminated can be steered. Mirrors the DELETE guard
// (running | pending) — a queued run will read the message on its first turn.
const STEERABLE = new Set(['running', 'pending'])

// POST /api/teams/[id]/runs/[runId]/messages — { content } → TeamMessage(kind:'user')
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; runId: string }> }) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const { id, runId } = await params

    const run = await prisma.teamRun.findFirst({
      where: { id: runId, teamId: id, team: { createdBy: auth.id } },
      select: { id: true, status: true },
    })
    if (!run) return NextResponse.json({ success: false, error: 'Run not found' }, { status: 404 })
    if (!STEERABLE.has(run.status)) {
      return NextResponse.json({ success: false, error: 'Run não está em andamento' }, { status: 400 })
    }

    // S6: multipart when the steering message carries images; JSON otherwise (S4 path).
    let raw = ''
    let attachments: TeamAttachment[] = []
    if (request.headers.get('content-type')?.includes('multipart/form-data')) {
      const form = await request.formData()
      raw = typeof form.get('content') === 'string' ? (form.get('content') as string) : ''
      attachments = await uploadImagesFromForm(runId, form)
    } else {
      const body = await request.json().catch(() => ({}))
      raw = typeof body?.content === 'string' ? body.content : ''
    }
    const content = raw.trim().slice(0, MAX_CONTENT)
    // An image-only steering message is valid; require text only when there are no images.
    if (!content && attachments.length === 0) {
      return NextResponse.json({ success: false, error: 'Mensagem vazia' }, { status: 400 })
    }

    // fromMemberId/toMemberId stay null (it's the human, not a roster member) → no
    // member FK to violate even if the roster is edited mid-run.
    const msg = await prisma.teamMessage.create({
      data: {
        runId,
        content: content || 'Imagem anexada (para análise visual).',
        kind: 'user',
        ...(attachments.length > 0 ? { attachments: attachments as unknown as object } : {}),
      },
      select: { id: true, content: true, kind: true, createdAt: true },
    })
    // S6: download the new image(s) to the run's local temp dir so the Lead can Read
    // them next turn (same process as the `after()` coordinator). Best-effort.
    if (attachments.length > 0) {
      try { await materializeRunAttachments(runId) }
      catch (err) { console.error('[Teams S6] materialize after live upload failed:', err) }
    }
    return NextResponse.json({ success: true, data: msg })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send message'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
