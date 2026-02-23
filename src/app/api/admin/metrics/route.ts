import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const PLAN_MRR: Record<string, number> = {
  pro: 297,
  business: 997,
  enterprise: 0, // contrato custom
}

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const d7 = new Date(now); d7.setDate(d7.getDate() - 7)
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30)
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)

  const [
    totalUsers,
    newUsersLast7,
    newUsersLast30,
    activeSubscriptions,
    recentUsers,
    planBreakdown,
    apiKeyCount,
    leadCount,
  ] = await Promise.all([
    prisma.user.count({ where: { status: 'active' } }),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.user.count({ where: { createdAt: { gte: d30 } } }),
    prisma.subscription.count({ where: { status: 'active' } }),
    prisma.user.findMany({
      where: { status: 'active' },
      select: { id: true, name: true, email: true, role: true, createdAt: true, lastLogin: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.subscription.groupBy({
      by: ['plan'],
      where: { status: 'active' },
      _count: { plan: true },
    }),
    prisma.apiKey.count({ where: { status: 'active' } }),
    prisma.salesLead.count(),
  ])

  // Calcula MRR estimado
  const mrr = planBreakdown.reduce((acc, p) => {
    return acc + (PLAN_MRR[p.plan] || 0) * p._count.plan
  }, 0)

  return NextResponse.json({
    success: true,
    data: {
      users: { total: totalUsers, newLast7: newUsersLast7, newLast30: newUsersLast30 },
      subscriptions: {
        active: activeSubscriptions,
        mrr,
        breakdown: planBreakdown.map(p => ({ plan: p.plan, count: p._count.plan, mrr: (PLAN_MRR[p.plan] || 0) * p._count.plan })),
      },
      apiKeys: { active: apiKeyCount },
      leads: { total: leadCount },
      recentUsers,
    },
  })
}
