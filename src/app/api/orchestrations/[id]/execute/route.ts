import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { chatWithAgent } from '@/lib/groq'
import { parseTasks, buildTaskPrompt, consolidateResults, TaskResult } from '@/lib/orchestration/task-parser'

interface AgentStep {
  agentId: string
  role: string
  prompt?: string
  condition?: string
  type?: 'agent' | 'task_splitter'
  splitterConfig?: {
    taskPattern: string
    confirmationMode: 'auto' | 'manual'
    contextMode: 'isolated' | 'accumulated'
    maxTasksPerRun?: number
  }
}

// Allow up to 30 minutes for orchestration execution (multiple agent calls, each up to 20 min)
export const maxDuration = 1800

// POST /api/orchestrations/[id]/execute - Execute orchestration
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { input, conversationId, startFromStep, resumeFromTask } = body

    // Fetch orchestration
    const orchestration = await prisma.agentOrchestration.findUnique({
      where: { id }
    })

    if (!orchestration) {
      return NextResponse.json({ success: false, error: 'Orchestration not found' }, { status: 404 })
    }

    if (orchestration.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Orchestration is not active' }, { status: 400 })
    }

    // Create execution record
    const execution = await prisma.orchestrationExecution.create({
      data: {
        orchestrationId: id,
        conversationId: conversationId || null,
        input: input || {},
        status: 'running'
      }
    })

    try {
      const agents = orchestration.agents as unknown as AgentStep[]
      const agentResults: any[] = []
      let finalOutput: any = null

      if (orchestration.strategy === 'sequential') {
        // Sequential execution with ACCUMULATED CONTEXT
        // Each agent receives the original input + ALL previous agents' outputs
        // This prevents context loss along the chain

        // Support starting from a specific step
        console.log(`[Orchestration] startFromStep=${startFromStep} (type=${typeof startFromStep}), total agents=${agents.length}`)
        const startStep = typeof startFromStep === 'number' ? startFromStep : (startFromStep !== undefined ? parseInt(startFromStep as any, 10) : undefined)
        const agentsToExecute = startStep !== undefined && startStep >= 0 && startStep < agents.length
          ? agents.slice(startStep)
          : agents
        console.log(`[Orchestration] Executing ${agentsToExecute.length} agents (from step ${startStep ?? 0})`)

        // Accumulated conversation history — each entry is a completed agent's output
        const conversationHistory: Array<{ role: string; agentName: string; output: string }> = []
        // If starting from a later step, seed history from previous results if available
        if (startStep && startStep > 0) {
          const existingExec = await prisma.orchestrationExecution.findFirst({
            where: { orchestrationId: id, status: 'completed' },
            orderBy: { startedAt: 'desc' }
          })
          if (existingExec?.agentResults) {
            const prevResults = existingExec.agentResults as any[]
            for (let i = 0; i < Math.min(startStep, prevResults.length); i++) {
              conversationHistory.push({
                role: prevResults[i].role,
                agentName: prevResults[i].agentName,
                output: prevResults[i].output
              })
            }
          }
        }

        let stepIndex = 0
        const MAX_GLOBAL_RETRIES = 10
        let totalRetries = 0
        // Track any active feedback for the current retry
        let pendingFeedback: string | null = null

        while (stepIndex < agentsToExecute.length) {
          const agentStep = agentsToExecute[stepIndex]

          // ── CHECK FOR CANCELLATION before each step ──
          const currentExecState = await prisma.orchestrationExecution.findUnique({
            where: { id: execution.id },
            select: { status: true }
          })
          if (currentExecState?.status === 'cancelled') {
            console.log(`[Orchestration] Execution ${execution.id} was cancelled by user`)
            // Final update already set by the DELETE handler
            return NextResponse.json({
              success: true,
              data: {
                executionId: execution.id,
                status: 'cancelled',
                agentResults: agentResults
              }
            })
          }

          // ── TASK SPLITTER HANDLING ──
          if (agentStep.type === 'task_splitter') {
            const splitterConfig = agentStep.splitterConfig || {
              taskPattern: '\\*\\*Task\\s+(WF-\\d+):\\*\\*\\s*(.+)',
              confirmationMode: 'auto' as const,
              contextMode: 'isolated' as const,
            }

            // Get previous agent's output
            const previousOutput = conversationHistory.length > 0
              ? conversationHistory[conversationHistory.length - 1].output
              : ''

            if (!previousOutput) {
              console.log(`[Orchestration] Task Splitter: no previous output to split, skipping`)
              stepIndex++
              continue
            }

            // Parse tasks from PM output
            const tasks = parseTasks(previousOutput, splitterConfig.taskPattern !== '\\*\\*Task\\s+(WF-\\d+):\\*\\*\\s*(.+)' ? splitterConfig.taskPattern : undefined)

            if (tasks.length === 0) {
              console.log(`[Orchestration] Task Splitter: no tasks found in previous output, passing through`)
              // Pass through — treat the previous output as a single task
              stepIndex++
              continue
            }

            console.log(`[Orchestration] Task Splitter: found ${tasks.length} tasks to execute`)

            // Limit tasks if configured
            const tasksToExecute = splitterConfig.maxTasksPerRun
              ? tasks.slice(0, splitterConfig.maxTasksPerRun)
              : tasks

            // Support resuming from a specific task (after rate limit)
            let startTaskIndex = 0
            let previousTaskResults: TaskResult[] = []
            if (resumeFromTask) {
              // Find the task index to resume from
              const resumeIdx = tasksToExecute.findIndex(t => t.id === resumeFromTask)
              if (resumeIdx > 0) {
                startTaskIndex = resumeIdx
                console.log(`[Orchestration] Task Splitter: resuming from task ${resumeFromTask} (index ${resumeIdx})`)

                // Load previous task results from the last execution
                const prevExec = await prisma.orchestrationExecution.findFirst({
                  where: { orchestrationId: id, status: 'rate_limited' },
                  orderBy: { startedAt: 'desc' }
                })
                if (prevExec?.agentResults) {
                  const prevResults = prevExec.agentResults as any[]
                  const splitterPrev = prevResults.find((r: any) => r.agentId === 'task-splitter' && r.taskResults)
                  if (splitterPrev?.taskResults) {
                    for (const tr of splitterPrev.taskResults) {
                      if (tr.success) {
                        const matchTask = tasksToExecute.find(t => t.id === tr.taskId)
                        if (matchTask) {
                          previousTaskResults.push({
                            task: matchTask,
                            output: tr.output || '',
                            success: true,
                            durationMs: tr.durationMs || 0,
                          })
                        }
                      }
                    }
                  }
                }
              }
            }

            // The NEXT step should be the executor agent
            const executorStepIndex = stepIndex + 1
            if (executorStepIndex >= agentsToExecute.length) {
              console.log(`[Orchestration] Task Splitter: no next agent to execute tasks with, skipping`)
              stepIndex++
              continue
            }

            const executorStep = agentsToExecute[executorStepIndex]
            const executorAgent = await prisma.agent.findUnique({
              where: { id: executorStep.agentId }
            })

            if (!executorAgent) {
              throw new Error(`Executor agent ${executorStep.agentId} not found`)
            }

            // Update execution state to show splitter is running
            await prisma.orchestrationExecution.update({
              where: { id: execution.id },
              data: {
                currentAgentId: executorAgent.id,
                agentResults: [...agentResults, {
                  agentId: 'task-splitter',
                  agentName: 'Task Splitter',
                  role: 'Task Splitter',
                  output: `Iniciando execução de ${tasksToExecute.length} tasks...`,
                  timestamp: new Date().toISOString(),
                  status: 'splitting',
                  totalTasks: tasksToExecute.length,
                  completedTasks: 0,
                }]
              }
            })

            const originalInput = typeof input === 'string' ? input : JSON.stringify(input, null, 2)
            const taskResults: TaskResult[] = [...previousTaskResults]
            let accumulatedTaskOutputs: string[] = previousTaskResults.map(r => r.output)

            for (let taskIdx = startTaskIndex; taskIdx < tasksToExecute.length; taskIdx++) {
              const task = tasksToExecute[taskIdx]

              // Check for cancellation before each task
              const cancelCheck = await prisma.orchestrationExecution.findUnique({
                where: { id: execution.id },
                select: { status: true }
              })
              if (cancelCheck?.status === 'cancelled') {
                console.log(`[Orchestration] Execution cancelled during task splitting`)
                return NextResponse.json({
                  success: true,
                  data: {
                    executionId: execution.id,
                    status: 'cancelled',
                    agentResults: agentResults
                  }
                })
              }

              console.log(`[Orchestration] Task Splitter: executing task ${taskIdx + 1}/${tasksToExecute.length}: ${task.id} - ${task.title}`)

              // Build the context for this task
              let additionalContext: string | undefined
              if (splitterConfig.contextMode === 'accumulated' && accumulatedTaskOutputs.length > 0) {
                additionalContext = accumulatedTaskOutputs
                  .map((output, i) => `── Resultado Task ${i + 1} ──\n${output}`)
                  .join('\n\n')
              }

              const taskPrompt = buildTaskPrompt(task, tasksToExecute.length, originalInput, additionalContext)

              // Add executor step-specific prompt if present
              const executorInstruction = executorStep.prompt
                ? `\nINSTRUÇÃO DO EXECUTOR:\n${executorStep.prompt}`
                : ''

              const fullTaskMessage = taskPrompt + executorInstruction

              const messages = [{
                role: 'user' as const,
                content: fullTaskMessage
              }]

              const taskStartTime = Date.now()

              try {
                const response = await chatWithAgent(executorAgent.id, messages, {})
                const taskEndTime = Date.now()
                const taskDuration = taskEndTime - taskStartTime

                taskResults.push({
                  task,
                  output: response.message,
                  success: true,
                  durationMs: taskDuration,
                })

                accumulatedTaskOutputs.push(response.message)

                // Update progress in DB
                await prisma.orchestrationExecution.update({
                  where: { id: execution.id },
                  data: {
                    agentResults: [...agentResults, {
                      agentId: 'task-splitter',
                      agentName: 'Task Splitter',
                      role: 'Task Splitter',
                      output: `Task ${taskIdx + 1}/${tasksToExecute.length} concluída: ${task.id}`,
                      timestamp: new Date().toISOString(),
                      status: 'splitting',
                      totalTasks: tasksToExecute.length,
                      completedTasks: taskIdx + 1,
                      taskResults: taskResults.map(r => ({
                        taskId: r.task.id,
                        taskTitle: r.task.title,
                        success: r.success,
                        durationMs: r.durationMs,
                        outputPreview: r.output.slice(0, 200),
                      })),
                    }]
                  }
                })

                console.log(`[Orchestration] Task Splitter: task ${task.id} completed in ${(taskDuration / 1000).toFixed(1)}s`)

              } catch (taskError: any) {
                const taskEndTime = Date.now()
                const taskDuration = taskEndTime - taskStartTime
                const errorMsg = taskError.message || 'Unknown error'

                console.error(`[Orchestration] Task Splitter: task ${task.id} failed:`, taskError)

                // Detect rate limit / token limit errors
                const isRateLimited = errorMsg.includes('hit your limit') ||
                  errorMsg.includes('rate limit') ||
                  errorMsg.includes('Too many requests') ||
                  errorMsg.includes('429') ||
                  (taskError.stderr && taskError.stderr.includes('hit your limit'))

                taskResults.push({
                  task,
                  output: '',
                  success: false,
                  durationMs: taskDuration,
                  error: isRateLimited ? 'Rate limit atingido' : errorMsg,
                })

                if (isRateLimited) {
                  console.log(`[Orchestration] Task Splitter: rate limit detected at task ${taskIdx + 1}/${tasksToExecute.length}. Stopping gracefully.`)

                  // Save partial results with remaining tasks info
                  const consolidatedPartial = consolidateResults(taskResults)
                  const remainingTasks = tasksToExecute.slice(taskIdx).map(t => ({ id: t.id, title: t.title, body: t.body }))

                  const splitterResult = {
                    agentId: 'task-splitter',
                    agentName: 'Task Splitter',
                    role: 'Task Splitter',
                    input: `Parsed ${tasksToExecute.length} tasks from previous step`,
                    output: consolidatedPartial,
                    timestamp: new Date().toISOString(),
                    model: 'task-splitter',
                    startedAt: new Date().toISOString(),
                    completedAt: new Date().toISOString(),
                    durationMs: taskResults.reduce((sum, r) => sum + r.durationMs, 0),
                    tokensUsed: 0,
                    status: 'rate_limited',
                    totalTasks: tasksToExecute.length,
                    completedTasks: taskResults.filter(r => r.success).length,
                    failedTasks: taskResults.filter(r => !r.success).length,
                    remainingTasks: remainingTasks,
                    lastCompletedTaskIndex: taskIdx - 1,
                    taskResults: taskResults.map(r => ({
                      taskId: r.task.id,
                      taskTitle: r.task.title,
                      success: r.success,
                      durationMs: r.durationMs,
                      output: r.output,
                      error: r.error,
                    })),
                  }

                  agentResults.push(splitterResult)

                  await prisma.orchestrationExecution.update({
                    where: { id: execution.id },
                    data: {
                      status: 'rate_limited',
                      error: `Rate limit atingido na task ${taskIdx + 1}/${tasksToExecute.length}. ${remainingTasks.length} tasks restantes.`,
                      agentResults: agentResults,
                      completedAt: new Date(),
                    }
                  })

                  return NextResponse.json({
                    success: true,
                    data: {
                      executionId: execution.id,
                      status: 'rate_limited',
                      agentResults,
                      remainingTasks: remainingTasks.length,
                    }
                  })
                }

                // For non-rate-limit errors, continue to next task
              }
            }

            // Consolidate all task results
            const consolidatedOutput = consolidateResults(taskResults)

            // Record the splitter result
            const splitterResult = {
              agentId: 'task-splitter',
              agentName: 'Task Splitter',
              role: 'Task Splitter',
              input: `Parsed ${tasksToExecute.length} tasks from previous step`,
              output: consolidatedOutput,
              timestamp: new Date().toISOString(),
              model: 'task-splitter',
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              durationMs: taskResults.reduce((sum, r) => sum + r.durationMs, 0),
              tokensUsed: 0,
              status: 'completed',
              totalTasks: tasksToExecute.length,
              completedTasks: taskResults.filter(r => r.success).length,
              failedTasks: taskResults.filter(r => !r.success).length,
              taskResults: taskResults.map(r => ({
                taskId: r.task.id,
                taskTitle: r.task.title,
                success: r.success,
                durationMs: r.durationMs,
                output: r.output,
                error: r.error,
              })),
            }

            agentResults.push(splitterResult)

            // Add consolidated output to conversation history
            conversationHistory.push({
              role: 'Task Splitter',
              agentName: 'Task Splitter',
              output: consolidatedOutput,
            })

            // Update DB
            await prisma.orchestrationExecution.update({
              where: { id: execution.id },
              data: { agentResults: agentResults }
            })

            // Skip the next step (executor) since we already executed it N times inside the loop
            stepIndex += 2
            continue
          }

          // Fetch agent details
          const agent = await prisma.agent.findUnique({
            where: { id: agentStep.agentId }
          })

          if (!agent) {
            throw new Error(`Agent ${agentStep.agentId} not found`)
          }

          // Update current agent
          await prisma.orchestrationExecution.update({
            where: { id: execution.id },
            data: { currentAgentId: agent.id }
          })

          // ── Build the full context message for this agent ──
          const originalInput = typeof input === 'string' ? input : JSON.stringify(input, null, 2)

          // Start with the original task
          const contextParts: string[] = [`TAREFA ORIGINAL DO USUÁRIO:\n${originalInput}`]

          // Add ALL previous agents' outputs (accumulated context)
          if (conversationHistory.length > 0) {
            contextParts.push('\n═══ CONTEXTO ACUMULADO DO PIPELINE ═══')
            for (const entry of conversationHistory) {
              const roleLabel = entry.role || entry.agentName
              contextParts.push(`\n── OUTPUT DO ${roleLabel.toUpperCase()} (${entry.agentName}) ──\n${entry.output}`)
            }
            contextParts.push('\n═══ FIM DO CONTEXTO ACUMULADO ═══')
          }

          // Add feedback correction if this is a retry after [REJECT]
          if (pendingFeedback) {
            contextParts.push(`\n⚠️ FEEDBACK DE CORREÇÃO (TENTATIVA ${totalRetries}):\n${pendingFeedback}`)
            pendingFeedback = null // Clear after use
          }

          // Add role-aware instruction
          const roleInstruction = agentStep.prompt
            ? `\nINSTRUÇÃO ESPECÍFICA PARA ESTA ETAPA:\n${agentStep.prompt}`
            : `\nVocê está no papel de "${agentStep.role}" neste pipeline de ${agentsToExecute.length} agentes. Analise todo o contexto acima e produza seu trabalho conforme seu papel.`

          contextParts.push(roleInstruction)

          const fullMessage = contextParts.join('\n')

          const messages = [{
            role: 'user' as const,
            content: fullMessage
          }]

          // Track step metrics
          const stepStartTime = Date.now()

          const response = await chatWithAgent(agent.id, messages, {})

          const stepEndTime = Date.now()
          const stepDuration = stepEndTime - stepStartTime

          const agentResponse = response.message

          // CHECK FOR FEEDBACK/REJECTION PROTOCOL
          // Format expected: [REJECT] Reason for rejection
          const rejectMatch = agentResponse.match(/^\[REJECT\]\s*([\s\S]*)/i)

          if (rejectMatch && stepIndex > 0 && totalRetries < MAX_GLOBAL_RETRIES) {
            const rejectionReason = rejectMatch[1].trim()
            console.log(`[Orchestration] Step ${stepIndex} (${agent.name}) REJECTED previous step. Reason: ${rejectionReason}`)

            // Log the rejection event in results
            agentResults.push({
              agentId: agent.id,
              agentName: agent.name,
              role: `${agentStep.role} (REJECTED)`,
              input: fullMessage,
              output: agentResponse,
              timestamp: new Date().toISOString(),
              model: response.model,
              startedAt: new Date(stepStartTime).toISOString(),
              completedAt: new Date(stepEndTime).toISOString(),
              durationMs: stepDuration,
              tokensUsed: response.usage?.total_tokens || 0,
              status: 'rejected'
            })

            // Move pointer BACK to previous agent and set feedback
            stepIndex--
            totalRetries++
            // Remove the last entry from history so the previous agent can redo it
            conversationHistory.pop()
            pendingFeedback = `O agente "${agentStep.role}" (${agent.name}) rejeitou sua saída anterior.\n\nMOTIVO: ${rejectionReason}\n\nPOR FAVOR, REFAÇA O TRABALHO CORRIGINDO OS PONTOS ACIMA.`

            // Update DB with the rejection event
            await prisma.orchestrationExecution.update({
              where: { id: execution.id },
              data: { agentResults: agentResults }
            })

            continue // Jump back to start of loop with decremented index
          }

          const stepResult = {
            agentId: agent.id,
            agentName: agent.name,
            role: agentStep.role,
            input: fullMessage,
            output: agentResponse,
            timestamp: new Date().toISOString(),
            model: response.model,
            startedAt: new Date(stepStartTime).toISOString(),
            completedAt: new Date(stepEndTime).toISOString(),
            durationMs: stepDuration,
            tokensUsed: response.usage?.total_tokens || 0
          }

          agentResults.push(stepResult)

          // Add this agent's output to accumulated conversation history
          conversationHistory.push({
            role: agentStep.role,
            agentName: agent.name,
            output: agentResponse
          })

          // Update DB incrementally so frontend can poll progress
          await prisma.orchestrationExecution.update({
            where: { id: execution.id },
            data: {
              agentResults: agentResults
            }
          })

          stepIndex++ // Advance to next step
        }

        finalOutput = agentResults[agentResults.length - 1]?.output || null

      } else if (orchestration.strategy === 'parallel') {
        // Parallel execution
        // We can't easily update DB sequentially inside Promise.all without race conditions on the JSON column
        // But we can update individual status if we had a status field.
        // For now, let's just wait for all. 
        // OR: We could use a for..of loop if we wanted visual progress even for parallel (simulated parallel).
        // Real parallel means they finish when they finish.

        const agentPromises = agents.map(async (agentStep) => {
          const agent = await prisma.agent.findUnique({
            where: { id: agentStep.agentId }
          })

          if (!agent) {
            throw new Error(`Agent ${agentStep.agentId} not found`)
          }

          const messages = [{
            role: 'user' as const,
            content: typeof input === 'string' ? input : JSON.stringify(input)
          }]

          if (agentStep.prompt) {
            messages[0].content = `INSTRUÇÃO ESPECÍFICA PARA ESTA ETAPA: ${agentStep.prompt}\n\nDADOS DE ENTRADA:\n${messages[0].content}`
          }

          // Track step metrics
          const stepStartTime = Date.now()
          const response = await chatWithAgent(agent.id, messages, {})
          const stepEndTime = Date.now()

          return {
            agentId: agent.id,
            agentName: agent.name,
            role: agentStep.role,
            input: input,
            output: response.message,
            timestamp: new Date().toISOString(),
            model: response.model,
            startedAt: new Date(stepStartTime).toISOString(),
            completedAt: new Date(stepEndTime).toISOString(),
            durationMs: stepEndTime - stepStartTime,
            tokensUsed: response.usage?.total_tokens || 0
          }
        })

        const results = await Promise.all(agentPromises)
        agentResults.push(...results)

        finalOutput = {
          results: results.map(r => ({ [r.role]: r.output })),
          summary: results.map(r => `${r.role}: ${r.output}`).join('\n\n')
        }

      } else if (orchestration.strategy === 'consensus') {
        // Consensus execution
        const agentPromises = agents.map(async (agentStep) => {
          const agent = await prisma.agent.findUnique({
            where: { id: agentStep.agentId }
          })

          if (!agent) {
            throw new Error(`Agent ${agentStep.agentId} not found`)
          }

          const messages = [{
            role: 'user' as const,
            content: typeof input === 'string' ? input : JSON.stringify(input)
          }]

          if (agentStep.prompt) {
            messages[0].content = `INSTRUÇÃO ESPECÍFICA PARA ESTA ETAPA: ${agentStep.prompt}\n\nDADOS DE ENTRADA:\n${messages[0].content}`
          }

          // Track step metrics
          const stepStartTime = Date.now()
          const response = await chatWithAgent(agent.id, messages, {})
          const stepEndTime = Date.now()

          return {
            agentId: agent.id,
            agentName: agent.name,
            role: agentStep.role,
            input: input,
            output: response.message,
            timestamp: new Date().toISOString(),
            model: response.model,
            startedAt: new Date(stepStartTime).toISOString(),
            completedAt: new Date(stepEndTime).toISOString(),
            durationMs: stepEndTime - stepStartTime,
            tokensUsed: response.usage?.total_tokens || 0
          }
        })

        const results = await Promise.all(agentPromises)
        agentResults.push(...results)

        // Simple consensus logic
        const outputs = results.map(r => r.output.trim().toLowerCase())
        const frequency: { [key: string]: number } = {}
        outputs.forEach(o => {
          frequency[o] = (frequency[o] || 0) + 1
        })

        const consensusOutput = Object.keys(frequency).reduce((a, b) =>
          frequency[a] > frequency[b] ? a : b
        )

        finalOutput = {
          consensus: consensusOutput,
          votes: frequency,
          allResponses: results.map(r => ({ agent: r.agentName, response: r.output }))
        }
      }

      // Calculate aggregated metrics
      const completedAt = new Date()
      const durationMs = completedAt.getTime() - new Date(execution.startedAt).getTime()
      const tokensUsed = agentResults.reduce((sum, r) => sum + (r.tokensUsed || 0), 0)
      const estimatedCost = (tokensUsed / 1000000) * 0.5 // $0.50 per 1M tokens (adjust based on model)

      // Update execution with success
      await prisma.orchestrationExecution.update({
        where: { id: execution.id },
        data: {
          status: 'completed',
          agentResults: agentResults,
          output: finalOutput,
          completedAt,
          durationMs,
          tokensUsed,
          estimatedCost
        }
      })

      return NextResponse.json({
        success: true,
        data: {
          executionId: execution.id,
          output: finalOutput,
          agentResults: agentResults
        }
      })

    } catch (error: any) {
      // Update execution with failure
      console.error('Orchestration execution failed logic:', error)
      const completedAt = new Date()
      const durationMs = completedAt.getTime() - new Date(execution.startedAt).getTime()

      // Fetch current execution to get agentResults that may have been partially saved
      const currentExecution = await prisma.orchestrationExecution.findUnique({
        where: { id: execution.id }
      })
      const partialResults = (currentExecution?.agentResults as any[]) || []
      const tokensUsed = partialResults.reduce((sum, r) => sum + (r.tokensUsed || 0), 0)

      await prisma.orchestrationExecution.update({
        where: { id: execution.id },
        data: {
          status: 'failed',
          error: error.message,
          completedAt,
          durationMs,
          tokensUsed
        }
      })

      throw error
    }

  } catch (error: any) {
    console.error('Error executing orchestration:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to execute orchestration' },
      { status: 500 }
    )
  }
}

// DELETE /api/orchestrations/[id]/execute - Cancel running execution
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Find the latest running execution for this orchestration
    const runningExecution = await prisma.orchestrationExecution.findFirst({
      where: {
        orchestrationId: id,
        status: 'running'
      },
      orderBy: { startedAt: 'desc' }
    })

    if (!runningExecution) {
      return NextResponse.json(
        { success: false, error: 'Nenhuma execução em andamento' },
        { status: 404 }
      )
    }

    // Mark as cancelled — the running loop will detect this between steps
    await prisma.orchestrationExecution.update({
      where: { id: runningExecution.id },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
        durationMs: new Date().getTime() - new Date(runningExecution.startedAt).getTime(),
        error: 'Execução cancelada pelo usuário'
      }
    })

    console.log(`[Orchestration] Execution ${runningExecution.id} cancelled by user`)

    return NextResponse.json({
      success: true,
      data: { executionId: runningExecution.id, status: 'cancelled' }
    })

  } catch (error: any) {
    console.error('Error cancelling execution:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to cancel execution' },
      { status: 500 }
    )
  }
}
