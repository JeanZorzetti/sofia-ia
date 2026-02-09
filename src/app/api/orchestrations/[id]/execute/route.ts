import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { getGroqClient } from '@/lib/groq'

interface AgentStep {
  agentId: string
  role: string
  prompt?: string
  condition?: string
}

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
    const { input, conversationId } = body

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
        // Sequential execution - each agent processes after the previous
        let currentInput = input

        for (const agentStep of agents) {
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

          // Execute agent
          const groq = getGroqClient()
          const systemPrompt = agentStep.prompt || agent.systemPrompt
          const userMessage = typeof currentInput === 'string'
            ? currentInput
            : JSON.stringify(currentInput)

          const chatCompletion = await groq.chat.completions.create({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage }
            ],
            model: agent.model,
            temperature: agent.temperature,
            max_tokens: 2000
          })

          const agentResponse = chatCompletion.choices[0]?.message?.content || ''

          agentResults.push({
            agentId: agent.id,
            agentName: agent.name,
            role: agentStep.role,
            input: currentInput,
            output: agentResponse,
            timestamp: new Date().toISOString()
          })

          // Next agent receives previous agent's output
          currentInput = agentResponse
        }

        finalOutput = agentResults[agentResults.length - 1]?.output || null

      } else if (orchestration.strategy === 'parallel') {
        // Parallel execution - all agents process simultaneously
        const agentPromises = agents.map(async (agentStep) => {
          const agent = await prisma.agent.findUnique({
            where: { id: agentStep.agentId }
          })

          if (!agent) {
            throw new Error(`Agent ${agentStep.agentId} not found`)
          }

          const groq = getGroqClient()
          const systemPrompt = agentStep.prompt || agent.systemPrompt
          const userMessage = typeof input === 'string'
            ? input
            : JSON.stringify(input)

          const chatCompletion = await groq.chat.completions.create({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage }
            ],
            model: agent.model,
            temperature: agent.temperature,
            max_tokens: 2000
          })

          const agentResponse = chatCompletion.choices[0]?.message?.content || ''

          return {
            agentId: agent.id,
            agentName: agent.name,
            role: agentStep.role,
            input: input,
            output: agentResponse,
            timestamp: new Date().toISOString()
          }
        })

        const results = await Promise.all(agentPromises)
        agentResults.push(...results)

        // Combine all outputs
        finalOutput = {
          results: results.map(r => ({ [r.role]: r.output })),
          summary: results.map(r => `${r.role}: ${r.output}`).join('\n\n')
        }

      } else if (orchestration.strategy === 'consensus') {
        // Consensus - all agents vote, majority wins
        const agentPromises = agents.map(async (agentStep) => {
          const agent = await prisma.agent.findUnique({
            where: { id: agentStep.agentId }
          })

          if (!agent) {
            throw new Error(`Agent ${agentStep.agentId} not found`)
          }

          const groq = getGroqClient()
          const systemPrompt = agentStep.prompt || agent.systemPrompt
          const userMessage = typeof input === 'string'
            ? input
            : JSON.stringify(input)

          const chatCompletion = await groq.chat.completions.create({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage }
            ],
            model: agent.model,
            temperature: agent.temperature,
            max_tokens: 2000
          })

          const agentResponse = chatCompletion.choices[0]?.message?.content || ''

          return {
            agentId: agent.id,
            agentName: agent.name,
            role: agentStep.role,
            input: input,
            output: agentResponse,
            timestamp: new Date().toISOString()
          }
        })

        const results = await Promise.all(agentPromises)
        agentResults.push(...results)

        // Simple consensus: use the most common response
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

      // Update execution with success
      await prisma.orchestrationExecution.update({
        where: { id: execution.id },
        data: {
          status: 'completed',
          agentResults: agentResults,
          output: finalOutput,
          completedAt: new Date()
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
      await prisma.orchestrationExecution.update({
        where: { id: execution.id },
        data: {
          status: 'failed',
          error: error.message,
          completedAt: new Date()
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
