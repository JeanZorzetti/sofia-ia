import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

// GET /api/orchestrations/executions - List all executions across orchestrations
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = (page - 1) * limit
    const status = searchParams.get('status')
    const orchestrationId = searchParams.get('orchestrationId')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Build where clause — filter by user's orchestrations
    const userOrchestrations = await prisma.agentOrchestration.findMany({
      where: { createdBy: auth.id },
      select: { id: true }
    })
    const orchestrationIds = userOrchestrations.map(o => o.id)

    const where: any = {
      orchestrationId: orchestrationId
        ? orchestrationId
        : { in: orchestrationIds }
    }

    if (status) {
      where.status = status
    }

    if (dateFrom || dateTo) {
      where.startedAt = {}
      if (dateFrom) where.startedAt.gte = new Date(dateFrom)
      if (dateTo) where.startedAt.lte = new Date(dateTo)
    }

    // Fetch executions with orchestration info
    const executions = await prisma.orchestrationExecution.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip,
      take: limit,
      include: {
        orchestration: {
          select: {
            id: true,
            name: true,
            strategy: true,
            agents: true
          }
        }
      }
    })

    const total = await prisma.orchestrationExecution.count({ where })

    // Apply search filter on JSON fields (client-side for now)
    let filtered = executions
    if (search && search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = executions.filter((exec) => {
        const inputStr = JSON.stringify(exec.input).toLowerCase()
        const outputStr = JSON.stringify(exec.output).toLowerCase()
        const orchName = exec.orchestration?.name?.toLowerCase() || ''
        return (
          inputStr.includes(searchLower) ||
          outputStr.includes(searchLower) ||
          orchName.includes(searchLower)
        )
      })
    }

    // Status counts
    const statusCounts = await prisma.orchestrationExecution.groupBy({
      by: ['status'],
      where: { orchestrationId: { in: orchestrationIds } },
      _count: true
    })

    const counts = {
      all: await prisma.orchestrationExecution.count({
        where: { orchestrationId: { in: orchestrationIds } }
      }),
      completed: statusCounts.find(s => s.status === 'completed')?._count || 0,
      failed: statusCounts.find(s => s.status === 'failed')?._count || 0,
      running: statusCounts.find(s => s.status === 'running')?._count || 0,
      pending: statusCounts.find(s => s.status === 'pending')?._count || 0,
      rate_limited: statusCounts.find(s => s.status === 'rate_limited')?._count || 0,
      cancelled: statusCounts.find(s => s.status === 'cancelled')?._count || 0
    }

    return NextResponse.json({
      success: true,
      data: filtered,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      counts
    })
  } catch (error: any) {
    console.error('Error fetching executions:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch executions' },
      { status: 500 }
    )
  }
}
