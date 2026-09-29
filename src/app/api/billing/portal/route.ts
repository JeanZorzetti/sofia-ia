import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { appUrl, getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/portal — Stripe Customer Portal for the caller's own customer only
 * (update card, switch plan, cancel at period end). Spec 013 FR-011/012/014.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const sub = await prisma.subscription.findUnique({
      where: { userId: auth.id },
      select: { stripeCustomerId: true },
    })
    if (!sub?.stripeCustomerId) {
      return NextResponse.json({ success: false, error: 'no_customer' }, { status: 404 })
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${appUrl()}/dashboard/billing`,
      locale: 'pt-BR',
    })
    return NextResponse.json({ success: true, data: { url: session.url } })
  } catch (error) {
    console.error('[billing portal]', error)
    return NextResponse.json({ success: false, error: 'portal_failed' }, { status: 500 })
  }
}
