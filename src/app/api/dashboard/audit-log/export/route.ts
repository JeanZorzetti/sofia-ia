import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/dashboard/audit-log/export — returns CSV
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30', 10)
    const action = searchParams.get('action') || undefined

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

    const logs = await prisma.userAuditLog.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000, // max export
    })

    // Build CSV
    const headers = ['Data', 'Acao', 'Resource', 'Resource ID', 'IP', 'Detalhes']
    const rows = logs.map((log) => {
      const meta = typeof log.metadata === 'object' && log.metadata !== null
        ? JSON.stringify(log.metadata)
        : '{}'
      return [
        new Date(log.createdAt).toISOString(),
        log.action,
        log.resource,
        log.resourceId || '',
        log.ip || '',
        meta,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`)
    })

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const filename = `audit-log-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[dashboard/audit-log/export] GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to export audit logs' }, { status: 500 })
  }
}
