import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

// GET /api/orchestrations/[id] - Get single orchestration
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

    const orchestration = await prisma.agentOrchestration.findUnique({
      where: { id },
      include: {
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
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

    return NextResponse.json({ success: true, data: orchestration })
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
