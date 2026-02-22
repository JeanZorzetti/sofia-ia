import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/orchestrations/[id]/stream - SSE stream for execution updates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { id } = await params

    // Verify orchestration exists
    const orchestration = await prisma.agentOrchestration.findUnique({
      where: { id }
    })

    if (!orchestration) {
      return new Response('Orchestration not found', { status: 404 })
    }

    // Create SSE stream
    const encoder = new TextEncoder()
    let intervalId: NodeJS.Timeout | null = null
    let isClosed = false

    // Track state for diff-based agent events
    let lastAgentCount = 0
    let lastCurrentAgentId: string | null = null
    let lastStatus: string | null = null

    const stream = new ReadableStream({
      async start(controller) {
        // Function to send SSE event
        const sendEvent = (event: string, data: any) => {
          if (isClosed) return

          try {
            const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
            controller.enqueue(encoder.encode(message))
          } catch (error) {
            // Controller is closed, stop trying to send
            isClosed = true
            if (intervalId) {
              clearInterval(intervalId)
              intervalId = null
            }
          }
        }

        // Send initial connection event
        sendEvent('connected', { orchestrationId: id, timestamp: new Date().toISOString() })

        // Poll for execution updates
        let pollErrors = 0
        intervalId = setInterval(async () => {
          if (isClosed) {
            if (intervalId) {
              clearInterval(intervalId)
              intervalId = null
            }
            return
          }

          try {
            // Get latest execution
            const latestExecution = await prisma.orchestrationExecution.findFirst({
              where: { orchestrationId: id },
              orderBy: { createdAt: 'desc' }
            })

            if (latestExecution) {
              pollErrors = 0 // Reset error counter on success

              const agentResults = (latestExecution.agentResults as any[]) || []
              const currentAgentCount = agentResults.length
              const currentAgentId = latestExecution.currentAgentId

              // ── AGENT-LEVEL EVENTS ──

              // Detect new agent started (currentAgentId changed)
              if (currentAgentId && currentAgentId !== lastCurrentAgentId) {
                sendEvent('agent-started', {
                  executionId: latestExecution.id,
                  agentId: currentAgentId,
                  stepIndex: currentAgentCount,
                  totalSteps: (orchestration.agents as any[])?.length || 0,
                  timestamp: new Date().toISOString()
                })
                lastCurrentAgentId = currentAgentId
              }

              // Detect agent completed (new results appeared)
              if (currentAgentCount > lastAgentCount) {
                for (let i = lastAgentCount; i < currentAgentCount; i++) {
                  const result = agentResults[i]
                  sendEvent('agent-completed', {
                    executionId: latestExecution.id,
                    stepIndex: i,
                    agentId: result.agentId,
                    agentName: result.agentName,
                    role: result.role,
                    status: result.status || 'completed',
                    durationMs: result.durationMs || 0,
                    tokensUsed: result.tokensUsed || 0,
                    outputPreview: (result.output || '').slice(0, 300),
                    timestamp: result.completedAt || new Date().toISOString()
                  })
                }
                lastAgentCount = currentAgentCount
              }

              // ── Task splitter progress ──
              const splitterResult = agentResults.find(
                (r: any) => r.agentId === 'task-splitter' && r.status === 'splitting'
              )
              if (splitterResult) {
                sendEvent('task-progress', {
                  executionId: latestExecution.id,
                  totalTasks: splitterResult.totalTasks,
                  completedTasks: splitterResult.completedTasks,
                  timestamp: new Date().toISOString()
                })
              }

              // ── GENERAL EXECUTION UPDATE ──
              sendEvent('execution-update', {
                executionId: latestExecution.id,
                status: latestExecution.status,
                currentAgentId: latestExecution.currentAgentId,
                agentResults: agentResults,
                output: latestExecution.output,
                error: latestExecution.error,
                startedAt: latestExecution.startedAt,
                completedAt: latestExecution.completedAt,
                durationMs: latestExecution.durationMs,
                tokensUsed: latestExecution.tokensUsed,
                estimatedCost: latestExecution.estimatedCost
              })

              // ── Auto-close stream on terminal states ──
              if (
                latestExecution.status !== lastStatus &&
                (latestExecution.status === 'completed' ||
                  latestExecution.status === 'failed' ||
                  latestExecution.status === 'cancelled' ||
                  latestExecution.status === 'rate_limited')
              ) {
                sendEvent('done', {
                  status: latestExecution.status,
                  durationMs: latestExecution.durationMs,
                  tokensUsed: latestExecution.tokensUsed,
                  estimatedCost: latestExecution.estimatedCost,
                  agentCount: currentAgentCount
                })
                isClosed = true
                if (intervalId) {
                  clearInterval(intervalId)
                  intervalId = null
                }
                try { controller.close() } catch (e) { /* already closed */ }
              }

              lastStatus = latestExecution.status
            }
          } catch (error) {
            pollErrors++
            console.error('Error polling execution:', error)
            // Stop polling after 5 consecutive errors to avoid spamming
            if (pollErrors >= 5) {
              sendEvent('error', { message: 'Too many polling errors, stopping stream' })
              isClosed = true
              if (intervalId) {
                clearInterval(intervalId)
                intervalId = null
              }
              try { controller.close() } catch (e) { /* already closed */ }
            }
          }
        }, 2000) // Poll every 2 seconds (slightly faster for better UX)

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          isClosed = true
          if (intervalId) {
            clearInterval(intervalId)
            intervalId = null
          }
          try {
            controller.close()
          } catch (e) {
            // Already closed
          }
        })
      },

      cancel() {
        isClosed = true
        if (intervalId) {
          clearInterval(intervalId)
          intervalId = null
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Disable nginx buffering
      }
    })

  } catch (error: any) {
    console.error('Error in SSE stream:', error)
    return new Response(error.message || 'Internal Server Error', { status: 500 })
  }
}
