import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { getUsageSummary, isPaid, trialEndsAt, withdrawalEndsAt } from '@/lib/plan-limits'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/billing
 * Returns the usage summary and the billing state (spec 013, contracts/billing-api.md).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const [summary, user] = await Promise.all([
      getUsageSummary(auth.id),
      prisma.user.findUnique({
        where: { id: auth.id },
        select: {
          createdAt: true,
          subscription: {
            select: {
              plan: true,
              status: true,
              stripeSubscriptionId: true,
              currentPeriodEnd: true,
              cancelAt: true,
              startedAt: true,
            },
          },
        },
      }),
    ])
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const sub = user.subscription
    const paid = isPaid(sub)
    const trialEnd = trialEndsAt(user.createdAt)
    const withdrawUntil = paid && sub?.startedAt ? withdrawalEndsAt(sub.startedAt) : null

    return NextResponse.json({
      success: true,
      data: {
        summary,
        billing: {
          paid,
          plan: paid ? sub!.plan : null,
          status: sub?.stripeSubscriptionId ? sub.status : null,
          trialEndsAt: !paid && now < trialEnd ? trialEnd : null,
          currentPeriodEnd: paid ? sub!.currentPeriodEnd : null,
          cancelAt: paid ? sub!.cancelAt : null,
          canWithdraw: !!withdrawUntil && now < withdrawUntil,
          withdrawUntil,
        },
      },
    })
  } catch (error) {
    console.error('[billing GET]', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
