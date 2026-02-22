import { useEffect, useRef, useState, useCallback } from 'react'

export interface ExecutionUpdate {
  executionId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'rate_limited'
  currentAgentId: string | null
  agentResults: any[]
  output: any
  error: string | null
  startedAt: string
  completedAt: string | null
  durationMs?: number
  tokensUsed?: number
  estimatedCost?: number
}

export interface AgentEvent {
  type: 'started' | 'completed' | 'task-progress'
  executionId: string
  agentId?: string
  agentName?: string
  role?: string
  stepIndex?: number
  totalSteps?: number
  status?: string
  durationMs?: number
  tokensUsed?: number
  outputPreview?: string
  totalTasks?: number
  completedTasks?: number
  timestamp: string
}

interface UseExecutionStreamOptions {
  orchestrationId: string
  enabled?: boolean
  onUpdate?: (update: ExecutionUpdate) => void
  onAgentEvent?: (event: AgentEvent) => void
  onError?: (error: Error) => void
  onConnected?: () => void
  onDone?: (summary: { status: string; durationMs?: number; tokensUsed?: number; agentCount?: number }) => void
}

export function useExecutionStream({
  orchestrationId,
  enabled = true,
  onUpdate,
  onAgentEvent,
  onError,
  onConnected,
  onDone
}: UseExecutionStreamOptions) {
  const [latestUpdate, setLatestUpdate] = useState<ExecutionUpdate | null>(null)
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<Error | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)

  // Use refs for callbacks to avoid re-connecting on every render
  const onUpdateRef = useRef(onUpdate)
  const onAgentEventRef = useRef(onAgentEvent)
  const onErrorRef = useRef(onError)
  const onConnectedRef = useRef(onConnected)
  const onDoneRef = useRef(onDone)

  // Keep refs up to date
  useEffect(() => {
    onUpdateRef.current = onUpdate
    onAgentEventRef.current = onAgentEvent
    onErrorRef.current = onError
    onConnectedRef.current = onConnected
    onDoneRef.current = onDone
  }, [onUpdate, onAgentEvent, onError, onConnected, onDone])

  useEffect(() => {
    if (!enabled || !orchestrationId) {
      return
    }

    const connect = () => {
      // Prevent too many reconnection attempts
      if (reconnectAttemptsRef.current > 5) {
        console.warn('Too many SSE reconnection attempts, stopping')
        return
      }

      // Create EventSource for SSE
      const url = `/api/orchestrations/${orchestrationId}/stream`
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      // Connected event
      eventSource.addEventListener('connected', () => {
        setIsConnected(true)
        setConnectionError(null)
        reconnectAttemptsRef.current = 0
        onConnectedRef.current?.()
      })

      // Execution update event
      eventSource.addEventListener('execution-update', (event) => {
        try {
          const update: ExecutionUpdate = JSON.parse(event.data)
          setLatestUpdate(update)
          onUpdateRef.current?.(update)
        } catch (err) {
          console.error('Error parsing execution update:', err)
        }
      })

      // Agent started event
      eventSource.addEventListener('agent-started', (event) => {
        try {
          const data = JSON.parse(event.data)
          const agentEvent: AgentEvent = {
            type: 'started',
            executionId: data.executionId,
            agentId: data.agentId,
            stepIndex: data.stepIndex,
            totalSteps: data.totalSteps,
            timestamp: data.timestamp
          }
          setAgentEvents(prev => [...prev, agentEvent])
          onAgentEventRef.current?.(agentEvent)
        } catch (err) {
          console.error('Error parsing agent-started event:', err)
        }
      })

      // Agent completed event
      eventSource.addEventListener('agent-completed', (event) => {
        try {
          const data = JSON.parse(event.data)
          const agentEvent: AgentEvent = {
            type: 'completed',
            executionId: data.executionId,
            agentId: data.agentId,
            agentName: data.agentName,
            role: data.role,
            stepIndex: data.stepIndex,
            status: data.status,
            durationMs: data.durationMs,
            tokensUsed: data.tokensUsed,
            outputPreview: data.outputPreview,
            timestamp: data.timestamp
          }
          setAgentEvents(prev => [...prev, agentEvent])
          onAgentEventRef.current?.(agentEvent)
        } catch (err) {
          console.error('Error parsing agent-completed event:', err)
        }
      })

      // Task progress event
      eventSource.addEventListener('task-progress', (event) => {
        try {
          const data = JSON.parse(event.data)
          const agentEvent: AgentEvent = {
            type: 'task-progress',
            executionId: data.executionId,
            totalTasks: data.totalTasks,
            completedTasks: data.completedTasks,
            timestamp: data.timestamp
          }
          onAgentEventRef.current?.(agentEvent)
        } catch (err) {
          console.error('Error parsing task-progress event:', err)
        }
      })

      // Done event
      eventSource.addEventListener('done', (event) => {
        try {
          const data = JSON.parse(event.data)
          onDoneRef.current?.(data)
          // Close connection on done
          eventSource.close()
          setIsConnected(false)
        } catch (err) {
          console.error('Error parsing done event:', err)
        }
      })

      // Error event (custom from our SSE)
      eventSource.addEventListener('error', (event: any) => {
        try {
          const errorData = JSON.parse(event.data)
          const error = new Error(errorData.message || 'Stream error')
          setConnectionError(error)
          onErrorRef.current?.(error)
        } catch {
          // Generic error (connection lost, etc.)
          const error = new Error('Connection lost')
          setConnectionError(error)
          onErrorRef.current?.(error)
        }
      })

      // Handle connection errors
      eventSource.onerror = () => {
        if (eventSource.readyState === 2) {
          setIsConnected(false)

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
          }

          // Exponential backoff reconnection
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000)
          reconnectAttemptsRef.current++

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        }
      }
    }

    // Initial connection
    connect()

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      setIsConnected(false)
    }
  }, [orchestrationId, enabled])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setIsConnected(false)
    }
  }, [])

  return {
    latestUpdate,
    agentEvents,
    isConnected,
    connectionError,
    disconnect
  }
}
