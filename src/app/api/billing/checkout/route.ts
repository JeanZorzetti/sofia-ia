import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { createBilling, PLANS, type PlanId } from '@/lib/abacatepay'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/checkout
 * Creates an AbacatePay checkout URL for upgrading to a paid plan.
 *
 * Body: { plan: 'pro' | 'business' }
 * Returns: { checkoutUrl: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { plan } = body as { plan: PlanId }

    if (!plan || plan === 'free') {
      return NextResponse.json(
        { success: false, error: 'Invalid plan. Choose pro or business.' },
        { status: 400 }
      )
    }

    if (!PLANS[plan]) {
      return NextResponse.json(
        { success: false, error: `Unknown plan: ${plan}` },
        { status: 400 }
      )
    }

    // Get full user info for customer name
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true },
    })

    const returnUrl =
      process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`
        : 'https://sofiaia.roilabs.com.br/dashboard/billing'

    const billing = await createBilling(
      plan as Exclude<PlanId, 'free'>,
      dbUser?.email || user.email,
      dbUser?.name || user.name,
      returnUrl,
      `${returnUrl}?success=1&plan=${plan}`
    )

    // Save the pending billing ID to the subscription record
    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {
        abacatePayBillingId: billing.id,
      },
      create: {
        userId: user.id,
        plan: 'free',
        status: 'pending',
        abacatePayBillingId: billing.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        checkoutUrl: billing.url,
        billingId: billing.id,
        amount: billing.amount,
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal error'
    console.error('[billing/checkout POST]', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
