import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { sendWithdrawalEmail } from '@/lib/email'
import { isPaid, withdrawalEndsAt } from '@/lib/plan-limits'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/withdraw — right of withdrawal (CDC art. 49, spec 013 FR-015).
 * Within 7 days of the first charge: full refund of every paid invoice of the caller's own
 * subscription (no fee deducted), then immediate cancellation. The plan drops to free via webhook.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const sub = await prisma.subscription.findUnique({
      where: { userId: auth.id },
      select: {
        plan: true,
        status: true,
        stripeSubscriptionId: true,
        startedAt: true,
        user: { select: { email: true } },
      },
    })
    if (!sub || !isPaid(sub) || !sub.startedAt || new Date() >= withdrawalEndsAt(sub.startedAt)) {
      return NextResponse.json({ success: false, error: 'not_eligible' }, { status: 409 })
    }

    const stripe = getStripe()
    const subscriptionId = sub.stripeSubscriptionId!
    let refundedCents = 0
    // API basil+: the PaymentIntent of an invoice is reached through its invoice payments.
    for await (const invoice of stripe.invoices.list({ subscription: subscriptionId, status: 'paid', limit: 100 })) {
      for await (const payment of stripe.invoicePayments.list({ invoice: invoice.id!, status: 'paid' })) {
        const pi = payment.payment.payment_intent
        const paymentIntentId = typeof pi === 'string' ? pi : pi?.id
        if (!paymentIntentId) continue
        // Refund only what is left on each charge. Stripe never refunds more than was charged, so a
        // double click cannot refund twice. No idempotency key on purpose: Stripe replays a stored
        // failure for 24h, which locked retries after a transient error (found in sandbox, 013).
        for await (const charge of stripe.charges.list({ payment_intent: paymentIntentId })) {
          if (charge.status !== 'succeeded') continue
          const remaining = charge.amount - charge.amount_refunded
          if (remaining > 0) {
            try {
              await stripe.refunds.create({ charge: charge.id, amount: remaining })
            } catch (err) {
              if ((err as { code?: string }).code !== 'charge_already_refunded') throw err
            }
          }
          refundedCents += charge.amount
        }
      }
    }

    await stripe.subscriptions.cancel(subscriptionId, { cancellation_details: { comment: 'withdrawal' } })
    await sendWithdrawalEmail(sub.user.email, refundedCents)

    return NextResponse.json({ success: true, data: { refunded: refundedCents, currency: 'brl' } })
  } catch (error) {
    console.error('[billing withdraw]', error)
    return NextResponse.json({ success: false, error: 'withdraw_failed' }, { status: 500 })
  }
}
