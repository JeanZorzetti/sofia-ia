'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

interface ExecutionStatus {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  orchestrationName?: string
}

interface UseExecutionNotificationsOptions {
  orchestrationId?: string
  enabled?: boolean
  pollInterval?: number
}

export function useExecutionNotifications({
  orchestrationId,
  enabled = true,
  pollInterval = 5000 // 5 seconds
}: UseExecutionNotificationsOptions) {
  const previousStatusesRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    if (!enabled || !orchestrationId) return

    const checkExecutions = async () => {
      try {
        const response = await fetch(`/api/orchestrations/${orchestrationId}?status=running&limit=50`)
        const data = await response.json()

        if (data.success && data.data?.executions) {
          const runningExecutions = data.data.executions as ExecutionStatus[]

          // Check each execution that was previously running
          for (const [execId, prevStatus] of previousStatusesRef.current.entries()) {
            if (prevStatus === 'running') {
              // Find current status
              const currentExecution = runningExecutions.find((e: ExecutionStatus) => e.id === execId)

              if (!currentExecution) {
                // Execution is no longer in running list, fetch its current status
                const execResponse = await fetch(`/api/orchestrations/${orchestrationId}`)
                const execData = await execResponse.json()

                if (execData.success) {
                  const completedExec = execData.data.executions?.find((e: ExecutionStatus) => e.id === execId)

                  if (completedExec) {
                    if (completedExec.status === 'completed') {
                      toast.success('Execução concluída com sucesso!', {
                        description: `ID: ${execId.substring(0, 8)}...`,
                        duration: 5000
                      })
                    } else if (completedExec.status === 'failed') {
                      toast.error('Execução falhou', {
                        description: `ID: ${execId.substring(0, 8)}...`,
                        duration: 5000
                      })
                    }

                    // Remove from tracking
                    previousStatusesRef.current.delete(execId)
                  }
                }
              }
            }
          }

          // Update tracking map with current running executions
          runningExecutions.forEach((exec: ExecutionStatus) => {
            if (!previousStatusesRef.current.has(exec.id)) {
              previousStatusesRef.current.set(exec.id, exec.status)
            }
          })
        }
      } catch (error) {
        console.error('Error checking execution notifications:', error)
      }
    }

    // Initial check
    checkExecutions()

    // Set up polling
    const interval = setInterval(checkExecutions, pollInterval)

    return () => {
      clearInterval(interval)
    }
  }, [orchestrationId, enabled, pollInterval])
}
