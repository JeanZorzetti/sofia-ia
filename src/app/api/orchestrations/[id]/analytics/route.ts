import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Fetch all executions for this orchestration
    const executions = await prisma.orchestrationExecution.findMany({
      where: { orchestrationId: id },
      orderBy: { startedAt: 'desc' }
    })

    if (executions.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalExecutions: 0,
          successRate: 0,
          avgDuration: 0,
          totalTokens: 0,
          estimatedCost: 0,
          mostUsedAgent: { name: 'N/A', count: 0 },
          executionsOverTime: [],
          stepFailureRate: []
        }
      })
    }

    // Calculate metrics
    const totalExecutions = executions.length
    const successfulExecutions = executions.filter(e => e.status === 'completed').length
    const successRate = (successfulExecutions / totalExecutions) * 100

    // Calculate average duration
    const completedExecutions = executions.filter(
      e => e.status === 'completed' && e.startedAt && e.completedAt
    )
    const totalDuration = completedExecutions.reduce((sum, exec) => {
      if (exec.completedAt && exec.startedAt) {
        return sum + (new Date(exec.completedAt).getTime() - new Date(exec.startedAt).getTime())
      }
      return sum
    }, 0)
    const avgDuration = completedExecutions.length > 0 ? totalDuration / completedExecutions.length : 0

    // Calculate total tokens
    const totalTokens = executions.reduce((sum, exec) => {
      const results = exec.agentResults as any[]
      if (!results) return sum
      return sum + results.reduce((s, r) => s + (r.tokensUsed || 0), 0)
    }, 0)

    // Find most used agent
    const agentUsage: { [key: string]: { name: string; count: number } } = {}
    executions.forEach(exec => {
      const results = exec.agentResults as any[]
      if (!results) return
      results.forEach(r => {
        const key = r.agentId || r.agentName
        if (!agentUsage[key]) {
          agentUsage[key] = { name: r.agentName || 'Unknown', count: 0 }
        }
        agentUsage[key].count++
      })
    })

    const mostUsedAgent = Object.values(agentUsage).reduce(
      (max, curr) => (curr.count > max.count ? curr : max),
      { name: 'N/A', count: 0 }
    )

    // Executions over time (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date.toISOString().split('T')[0]
    })

    const executionsOverTime = last7Days.map(date => {
      const dayExecutions = executions.filter(exec => {
        const execDate = new Date(exec.startedAt).toISOString().split('T')[0]
        return execDate === date
      })

      return {
        date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        success: dayExecutions.filter(e => e.status === 'completed').length,
        failed: dayExecutions.filter(e => e.status === 'failed').length
      }
    })

    // Step failure rate analysis
    const stepStats: {
      [key: string]: {
        step: string
        agentName: string
        totalCount: number
        failureCount: number
      }
    } = {}

    executions.forEach(exec => {
      const results = exec.agentResults as any[]
      if (!results) return

      results.forEach((step, index) => {
        const key = `${step.role}-${step.agentName}`
        if (!stepStats[key]) {
          stepStats[key] = {
            step: step.role,
            agentName: step.agentName,
            totalCount: 0,
            failureCount: 0
          }
        }

        stepStats[key].totalCount++

        // Check if this step failed (either error in step or execution failed after this step)
        if (exec.status === 'failed') {
          // If execution failed, check if it failed at or after this step
          const isLastStep = index === results.length - 1
          const hasNextStep = results.length > index + 1

          // If it's the last step and execution failed, count it as failure
          // Or if there's no next step (execution stopped here)
          if (isLastStep || !hasNextStep) {
            stepStats[key].failureCount++
          }
        }
      })
    })

    const stepFailureRate = Object.values(stepStats)
      .map(stat => ({
        step: stat.step,
        agentName: stat.agentName,
        failureCount: stat.failureCount,
        totalCount: stat.totalCount,
        failureRate: (stat.failureCount / stat.totalCount) * 100
      }))
      .filter(stat => stat.failureRate > 0) // Only show steps with failures
      .sort((a, b) => b.failureRate - a.failureRate)
      .slice(0, 10) // Top 10 failure-prone steps

    return NextResponse.json({
      success: true,
      data: {
        totalExecutions,
        successRate,
        avgDuration,
        totalTokens,
        estimatedCost: 0, // Calculated on frontend based on model
        mostUsedAgent,
        executionsOverTime,
        stepFailureRate
      }
    })
  } catch (error: any) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
