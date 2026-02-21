import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

// GET /api/orchestrations/[id] - Get single orchestration with optional execution filters
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
    const { searchParams } = new URL(request.url)

    // Pagination params
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = (page - 1) * limit

    // Filter params
    const status = searchParams.get('status') // completed, failed, running, pending
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search') // search in input/output

    // Build where clause for executions
    const executionWhere: any = {
      orchestrationId: id
    }

    if (status) {
      executionWhere.status = status
    }

    if (dateFrom || dateTo) {
      executionWhere.startedAt = {}
      if (dateFrom) {
        executionWhere.startedAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        executionWhere.startedAt.lte = new Date(dateTo)
      }
    }

    // Get orchestration base data
    const orchestration = await prisma.agentOrchestration.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            executions: true
          }
        }
      }
    })

    if (!orchestration) {
      return NextResponse.json({ success: false, error: 'Orchestration not found' }, { status: 404 })
    }

    // Get filtered executions with pagination
    const executions = await prisma.orchestrationExecution.findMany({
      where: executionWhere,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })

    // Get total count for pagination
    const totalExecutions = await prisma.orchestrationExecution.count({
      where: executionWhere
    })

    // Get status counts
    const statusCounts = await prisma.orchestrationExecution.groupBy({
      by: ['status'],
      where: { orchestrationId: id },
      _count: true
    })

    const counts = {
      all: orchestration._count.executions,
      completed: statusCounts.find(s => s.status === 'completed')?._count || 0,
      failed: statusCounts.find(s => s.status === 'failed')?._count || 0,
      running: statusCounts.find(s => s.status === 'running')?._count || 0,
      pending: statusCounts.find(s => s.status === 'pending')?._count || 0
    }

    // Client-side search filter (for now, since JSON fields are not easily searchable)
    let filteredExecutions = executions
    if (search && search.trim()) {
      const searchLower = search.toLowerCase()
      filteredExecutions = executions.filter((exec) => {
        const inputStr = JSON.stringify(exec.input).toLowerCase()
        const outputStr = JSON.stringify(exec.output).toLowerCase()
        return inputStr.includes(searchLower) || outputStr.includes(searchLower)
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...orchestration,
        executions: filteredExecutions
      },
      pagination: {
        page,
        limit,
        total: totalExecutions,
        totalPages: Math.ceil(totalExecutions / limit)
      },
      counts
    })
  } catch (error: any) {
    console.error('Error fetching orchestration:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch orchestration' },
      { status: 500 }
    )
  }
}

// PUT /api/orchestrations/[id] - Update orchestration
export async function PUT(
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
    const { name, description, agents, strategy, config, status } = body

    const orchestration = await prisma.agentOrchestration.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(agents && { agents }),
        ...(strategy && { strategy }),
        ...(config && { config }),
        ...(status && { status })
      }
    })

    return NextResponse.json({ success: true, data: orchestration })
  } catch (error: any) {
    console.error('Error updating orchestration:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update orchestration' },
      { status: 500 }
    )
  }
}

// DELETE /api/orchestrations/[id] - Delete orchestration
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

    await prisma.agentOrchestration.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting orchestration:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete orchestration' },
      { status: 500 }
    )
  }
}
