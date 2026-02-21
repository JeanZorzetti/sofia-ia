import { useEffect, useRef, useState } from 'react'

export interface ExecutionUpdate {
  executionId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  currentAgentId: string | null
  agentResults: any[]
  output: any
  error: string | null
  startedAt: string
  completedAt: string | null
}

interface UseExecutionStreamOptions {
  orchestrationId: string
  enabled?: boolean
  onUpdate?: (update: ExecutionUpdate) => void
  onError?: (error: Error) => void
  onConnected?: () => void
}

export function useExecutionStream({
  orchestrationId,
  enabled = true,
  onUpdate,
  onError,
  onConnected
}: UseExecutionStreamOptions) {
  const [latestUpdate, setLatestUpdate] = useState<ExecutionUpdate | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<Error | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)

  // Use refs for callbacks to avoid re-connecting on every render
  const onUpdateRef = useRef(onUpdate)
  const onErrorRef = useRef(onError)
  const onConnectedRef = useRef(onConnected)

  // Keep refs up to date
  useEffect(() => {
    onUpdateRef.current = onUpdate
    onErrorRef.current = onError
    onConnectedRef.current = onConnected
  }, [onUpdate, onError, onConnected])

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
        reconnectAttemptsRef.current = 0 // Reset on successful connection
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

    // Error event
    eventSource.addEventListener('error', (event: any) => {
      try {
        const errorData = JSON.parse(event.data)
        const error = new Error(errorData.message || 'Stream error')
        setConnectionError(error)
        onErrorRef.current?.(error)
      } catch {
        // Generic error
        const error = new Error('Connection lost')
        setConnectionError(error)
        onErrorRef.current?.(error)
      }
    })

      // Handle connection errors
      eventSource.onerror = () => {
        // Only handle if connection is actually closed (readyState === 2)
        // readyState: 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
        if (eventSource.readyState === 2) {
          setIsConnected(false)

          // Clear any pending reconnection attempts
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
          }

          // Attempt to reconnect with exponential backoff
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
  }, [orchestrationId, enabled]) // Callbacks are handled via refs to avoid unnecessary reconnections

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setIsConnected(false)
    }
  }

  return {
    latestUpdate,
    isConnected,
    connectionError,
    disconnect
  }
}
