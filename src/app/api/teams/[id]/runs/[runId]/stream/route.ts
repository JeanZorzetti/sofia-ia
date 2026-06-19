// src/app/api/teams/[id]/runs/[runId]/stream/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { reconcileStaleRun } from '@/lib/orchestration/team/team-reconcile'

export const dynamic = 'force-dynamic'

const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'rate_limited'])

// GET /api/teams/[id]/runs/[runId]/stream — SSE updates by polling the run record.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; runId: string }> }) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return new Response('Unauthorized', { status: 401 })
  const { id, runId } = await params

  await reconcileStaleRun(runId)
  const run = await prisma.teamRun.findFirst({ where: { id: runId, teamId: id, team: { createdBy: auth.id } } })
  if (!run) return new Response('Run not found', { status: 404 })

  const encoder = new TextEncoder()
  let intervalId: ReturnType<typeof setInterval> | null = null
  let isClosed = false
  let lastTaskSig = ''
  let lastMsgCount = 0
  let lastTermSig = ''
  let terminalSeenAt = 0 // first tick we observed a terminal status (C2.1 delivery grace)

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
          // Delta polling (Sprint 2): the run record + tasks are bounded, but the
          // message log grows for the whole run. Fetch the run/tasks with a narrow
          // select and only the *new* messages past the cursor (`skip: lastMsgCount`
          // over a stable order) instead of re-reading every message each tick.
          // S2.2: also aggregate token usage per member for the per-member panel.
          const [current, newMessages, usageRows] = await Promise.all([
            prisma.teamRun.findUnique({
              where: { id: runId },
              select: {
                status: true, output: true, error: true, turnsUsed: true, tokensUsed: true,
                estimatedCost: true, durationMs: true, repoUrl: true, branch: true, prUrl: true,
                commitSha: true, changedFiles: true, mode: true,
                tasks: {
                  orderBy: { position: 'asc' },
                  select: {
                    id: true, title: true, status: true, assigneeId: true,
                    retryCount: true, reviewNote: true, result: true, artifacts: true,
                    dependsOn: true, related: true, historyEvents: true,
                  },
                },
              },
            }),
            prisma.teamMessage.findMany({
              where: { runId },
              orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
              skip: lastMsgCount,
              select: {
                id: true, fromMemberId: true, toMemberId: true,
                kind: true, summary: true, content: true, taskId: true,
              },
            }),
            prisma.teamMemberUsage.groupBy({
              by: ['memberId'],
              where: { runId },
              _sum: { tokens: true },
            }),
          ])
          if (!current) return
          pollErrors = 0

          // Task board changes (signature of id:status:retry + history length).
          // S2.2: include the per-task history length so a new lifecycle event re-emits
          // the board even when status/retry don't change (e.g. an owner_changed) — the
          // timeline arrives live instead of waiting for the next status transition.
          const sig = current.tasks
            .map(t => `${t.id}:${t.status}:${t.retryCount}:${Array.isArray(t.historyEvents) ? t.historyEvents.length : 0}`)
            .join('|')
          if (sig !== lastTaskSig) {
            send('board', {
              tasks: current.tasks.map(t => ({
                id: t.id, title: t.title, status: t.status, assigneeId: t.assigneeId,
                retryCount: t.retryCount, reviewNote: t.reviewNote, dependsOn: t.dependsOn,
                related: t.related,
                resultPreview: (t.result ?? '').slice(0, 300),
                historyEvents: Array.isArray(t.historyEvents) ? t.historyEvents : [],
              })),
            })
            lastTaskSig = sig
          }

          // Terminal artifacts (code-runs only): command transcripts per task.
          const termSig = current.tasks
            .map(t => `${t.id}:${t.artifacts ? JSON.stringify(t.artifacts).length : 0}`)
            .join('|')
          if (termSig !== lastTermSig) {
            const withArtifacts = current.tasks.filter(t => t.artifacts)
            if (withArtifacts.length > 0) {
              send('terminal', {
                tasks: withArtifacts.map(t => ({ taskId: t.id, title: t.title, artifacts: t.artifacts })),
              })
            }
            lastTermSig = termSig
          }

          // New messages (delta only — see the fetch above)
          if (newMessages.length > 0) {
            for (const m of newMessages) {
              send('message', {
                id: m.id, fromMemberId: m.fromMemberId, toMemberId: m.toMemberId,
                kind: m.kind, summary: m.summary, content: m.content.slice(0, 500), taskId: m.taskId,
              })
            }
            lastMsgCount += newMessages.length
          }

          // Status / metrics (+ git delivery fields for code-runs — Sub-projeto C C1)
          // S2.2: usageByMember aggregated per tick for the per-member panel.
          send('status', {
            status: current.status, output: current.output, error: current.error,
            turnsUsed: current.turnsUsed, tokensUsed: current.tokensUsed,
            estimatedCost: current.estimatedCost, durationMs: current.durationMs,
            repoUrl: current.repoUrl, branch: current.branch, prUrl: current.prUrl,
            commitSha: current.commitSha, changedFiles: current.changedFiles,
            usageByMember: usageRows.map(r => ({ memberId: r.memberId, tokens: r._sum.tokens ?? 0 })),
          })

          // Close on terminal status — but for code-runs bound to a repo, keep the
          // stream open until the teardown writes the delivery (diff/PR) so it arrives
          // live without a manual reload (Sub-projeto C — C2.1). A grace cap avoids a
          // hung stream if the teardown never settles. The `status` event above already
          // ships changedFiles/prUrl each tick, so no extra event is needed.
          if (TERMINAL.has(current.status)) {
            if (terminalSeenAt === 0) terminalSeenAt = Date.now()
            const awaitingDelivery =
              current.mode === 'code' && !!current.repoUrl && current.status === 'completed' &&
              current.changedFiles === null && !current.prUrl && !current.error
            if (!awaitingDelivery || Date.now() - terminalSeenAt > 45_000) {
              send('done', { status: current.status, output: current.output })
              isClosed = true
              if (intervalId) { clearInterval(intervalId); intervalId = null }
              try { controller.close() } catch { /* already closed */ }
            }
          }
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
