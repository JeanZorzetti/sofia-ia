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
              sendEvent('execution-update', {
                executionId: latestExecution.id,
                status: latestExecution.status,
                currentAgentId: latestExecution.currentAgentId,
                agentResults: latestExecution.agentResults,
                output: latestExecution.output,
                error: latestExecution.error,
                startedAt: latestExecution.startedAt,
                completedAt: latestExecution.completedAt
              })

              // Auto-close stream once execution is done
              if (latestExecution.status === 'completed' || latestExecution.status === 'failed') {
                sendEvent('done', { status: latestExecution.status })
                isClosed = true
                if (intervalId) {
                  clearInterval(intervalId)
                  intervalId = null
                }
                try { controller.close() } catch (e) { /* already closed */ }
              }
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
        }, 3000) // Poll every 3 seconds (avoids connection pool exhaustion)

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
