// src/app/api/teams/[id]/runs/[runId]/stream/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'rate_limited'])

// GET /api/teams/[id]/runs/[runId]/stream — SSE updates by polling the run record.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; runId: string }> }) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return new Response('Unauthorized', { status: 401 })
  const { id, runId } = await params

  const run = await prisma.teamRun.findFirst({ where: { id: runId, teamId: id, team: { createdBy: auth.id } } })
  if (!run) return new Response('Run not found', { status: 404 })

  const encoder = new TextEncoder()
  let intervalId: ReturnType<typeof setInterval> | null = null
  let isClosed = false
  let lastTaskSig = ''
  let lastMsgCount = 0
  let lastStatus = ''

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (isClosed) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          isClosed = true
          if (intervalId) { clearInterval(intervalId); intervalId = null }
        }
      }

      send('connected', { runId, timestamp: new Date().toISOString() })

      let pollErrors = 0
      intervalId = setInterval(async () => {
        if (isClosed) { if (intervalId) { clearInterval(intervalId); intervalId = null } return }
        try {
          const current = await prisma.teamRun.findUnique({
            where: { id: runId },
            include: { tasks: { orderBy: { position: 'asc' } }, messages: { orderBy: { createdAt: 'asc' } } },
          })
          if (!current) return
          pollErrors = 0

          // Task board changes (signature of id:status:retry)
          const sig = current.tasks.map(t => `${t.id}:${t.status}:${t.retryCount}`).join('|')
          if (sig !== lastTaskSig) {
            send('board', {
              tasks: current.tasks.map(t => ({
                id: t.id, title: t.title, status: t.status, assigneeId: t.assigneeId,
                retryCount: t.retryCount, reviewNote: t.reviewNote,
                resultPreview: (t.result ?? '').slice(0, 300),
              })),
            })
            lastTaskSig = sig
          }

          // New messages
          if (current.messages.length > lastMsgCount) {
            for (let i = lastMsgCount; i < current.messages.length; i++) {
              const m = current.messages[i]
              send('message', {
                id: m.id, fromMemberId: m.fromMemberId, toMemberId: m.toMemberId,
                kind: m.kind, summary: m.summary, content: m.content.slice(0, 500), taskId: m.taskId,
              })
            }
            lastMsgCount = current.messages.length
          }

          // Status / metrics
          send('status', {
            status: current.status, output: current.output, error: current.error,
            turnsUsed: current.turnsUsed, tokensUsed: current.tokensUsed,
            estimatedCost: current.estimatedCost, durationMs: current.durationMs,
          })

          if (current.status !== lastStatus && TERMINAL.has(current.status)) {
            send('done', { status: current.status, output: current.output })
            isClosed = true
            if (intervalId) { clearInterval(intervalId); intervalId = null }
            try { controller.close() } catch { /* already closed */ }
          }
          lastStatus = current.status
        } catch (err) {
          pollErrors++
          console.error('Error polling team run:', err)
          if (pollErrors >= 5) {
            send('error', { message: 'Too many polling errors, stopping stream' })
            isClosed = true
            if (intervalId) { clearInterval(intervalId); intervalId = null }
            try { controller.close() } catch { /* already closed */ }
          }
        }
      }, 1000)

      // Stop when the client disconnects.
      request.signal.addEventListener('abort', () => {
        isClosed = true
        if (intervalId) { clearInterval(intervalId); intervalId = null }
        try { controller.close() } catch { /* already closed */ }
      })
    },
    cancel() {
      isClosed = true
      if (intervalId) { clearInterval(intervalId); intervalId = null }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
