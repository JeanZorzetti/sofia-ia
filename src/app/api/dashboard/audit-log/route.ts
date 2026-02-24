import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/dashboard/audit-log?action=&days=&page=
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || undefined
    const days = parseInt(searchParams.get('days') || '7', 10)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = 50
    const skip = (page - 1) * pageSize

    const since = new Date()
    since.setDate(since.getDate() - days)

    const where: {
      userId: string
      createdAt: { gte: Date }
      action?: string
    } = {
      userId: user.id,
      createdAt: { gte: since },
    }
    if (action) where.action = action

    const [logs, total] = await Promise.all([
      prisma.userAuditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip,
      }),
      prisma.userAuditLog.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasMore: skip + pageSize < total,
      },
    })
  } catch (error) {
    console.error('[dashboard/audit-log] GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
