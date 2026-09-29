import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { getDailySignups, getFunnelCounts, getEngagementCounts } from '@/lib/analytics'
import { PAID_SUBSCRIPTION_WHERE } from '@/lib/plan-limits'
import { PLANS } from '@/lib/plans'
import { getStripe, isStripeConfigured } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

const PLAN_MRR: Record<string, number> = {
  pro: PLANS.pro.priceBRL,
  business: PLANS.business.priceBRL,
  enterprise: 0, // contrato custom
}

/**
 * Cash in this month from Stripe (paid invoices minus refunds), in BRL — spec 013 SC-006.
 * ponytail: month boundary in server time (UTC) and invoices bucketed by creation date; good enough
 * at dozens of invoices, switch to balance transactions if finance ever reconciles against it.
 */
async function stripeRevenueThisMonth(now: Date): Promise<number | null> {
  if (!isStripeConfigured()) return null
  try {
    const stripe = getStripe()
    const since = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000)
    let cents = 0
    for await (const inv of stripe.invoices.list({ status: 'paid', created: { gte: since }, limit: 100 })) cents += inv.amount_paid
    for await (const r of stripe.refunds.list({ created: { gte: since }, limit: 100 })) if (r.status === 'succeeded') cents -= r.amount
    return cents / 100
  } catch (err) {
    console.error('[admin metrics] stripe revenue', err)
    return null
  }
}

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const d7 = new Date(now); d7.setDate(d7.getDate() - 7)
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30)

  const [
    totalUsers,
    newUsersLast7,
    newUsersLast30,
    activeSubscriptions,
    recentUsers,
    planBreakdown,
    apiKeyCount,
    leadCount,
    dailySignups,
    funnel,
    engagement,
  ] = await Promise.all([
    prisma.user.count({ where: { status: 'active' } }),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.user.count({ where: { createdAt: { gte: d30 } } }),
    prisma.subscription.count({ where: PAID_SUBSCRIPTION_WHERE }),
    prisma.user.findMany({
      where: { status: 'active' },
      select: { id: true, name: true, email: true, role: true, createdAt: true, lastLogin: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.subscription.groupBy({
      by: ['plan'],
      where: PAID_SUBSCRIPTION_WHERE,
      _count: { plan: true },
    }),
    prisma.apiKey.count({ where: { status: 'active' } }),
    prisma.salesLead.count(),
    getDailySignups(30),
    getFunnelCounts(),
    getEngagementCounts(d30),
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
        revenueMonth: await stripeRevenueThisMonth(now),
        breakdown: planBreakdown.map(p => ({
          plan: p.plan,
          count: p._count.plan,
          mrr: (PLAN_MRR[p.plan] || 0) * p._count.plan,
        })),
      },
      apiKeys: { active: apiKeyCount },
      leads: { total: leadCount },
      recentUsers,
      // V3 additions
      dailySignups,   // last 30 days sparkline data
      funnel,         // signups → agent → executed → paid
      engagement,     // orchestrations, agents, kbs (last 30d)
    },
  })
}
