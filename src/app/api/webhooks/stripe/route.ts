import type Stripe from 'stripe'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { COMPANY } from '@/lib/company'
import {
  sendBillingAlertToTeam,
  sendCancellationScheduledEmail,
  sendSubscriptionEndedEmail,
} from '@/lib/email'
import { PLANS, type PlanId } from '@/lib/plans'
import { prisma } from '@/lib/prisma'
import { getStripe, syncSubscription } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

const idOf = (x: string | { id: string } | null | undefined) => (typeof x === 'string' ? x : x?.id ?? null)

/** The subscription an event is about, if any (research R7). */
function subscriptionIdOf(event: Stripe.Event): string | null {
  switch (event.type) {
    case 'checkout.session.completed':
      return idOf(event.data.object.subscription)
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      return event.data.object.id
    case 'invoice.paid':
    case 'invoice.payment_failed':
      return idOf(event.data.object.parent?.subscription_details?.subscription)
    default:
      return null
  }
}

async function alertTeam(kind: 'dispute' | 'fraud_warning', object: Stripe.Dispute | Stripe.Radar.EarlyFraudWarning) {
  const charge = await getStripe().charges.retrieve(idOf(object.charge)!)
  await sendBillingAlertToTeam(COMPANY.email, kind, {
    customerId: idOf(charge.customer),
    amountCents: charge.amount,
    objectId: object.id,
  })
}

async function handle(event: Stripe.Event) {
  if (event.type === 'charge.dispute.created') return alertTeam('dispute', event.data.object)
  if (event.type === 'radar.early_fraud_warning.created') return alertTeam('fraud_warning', event.data.object)

  const subscriptionId = subscriptionIdOf(event)
  if (!subscriptionId) return
  const result = await syncSubscription(subscriptionId)
  if (!result) return

  const row = await prisma.subscription.findUnique({
    where: { userId: result.userId },
    select: { plan: true, cancelAt: true, user: { select: { email: true } } },
  })
  if (!row) return
  const planName = PLANS[row.plan as PlanId]?.name ?? row.plan
  const s = result.subscription

  // Emails Stripe does not send (receipts and failed payments come from Stripe itself).
  if (!result.before.cancelAt && row.cancelAt && s.status !== 'canceled') {
    await sendCancellationScheduledEmail(row.user.email, planName, row.cancelAt)
  }
  if (event.type === 'customer.subscription.deleted' && s.cancellation_details?.comment !== 'withdrawal') {
    await sendSubscriptionEndedEmail(row.user.email, planName)
  }
}

/**
 * POST /api/webhooks/stripe — fail-closed (constitution V): signature checked on the raw body,
 * each event id processed once (stripe_events), processing failure → 500 so Stripe retries.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = request.headers.get('stripe-signature')
  if (!secret || !signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ received: true, duplicate: true })
    }
    throw err
  }

  try {
    await handle(event)
  } catch (err) {
    console.error('[stripe webhook]', event.type, event.id, err)
    // Forget the event so Stripe's retry gets processed.
    await prisma.stripeEvent.delete({ where: { id: event.id } }).catch(() => {})
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
