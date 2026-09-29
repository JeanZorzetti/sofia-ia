/**
 * Stripe billing (spec 013). Hosted Checkout + Customer Portal + webhooks; the Polaris side only
 * maps a Stripe customer to one `subscriptions` row and mirrors the subscription state into it.
 */
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import type { PaidPlanId, PlanId } from '@/lib/plans'
import type { TaxId } from '@/lib/tax-id'

let _stripe: Stripe | null = null

// Lazy so `next build` never needs the key (same rule as the Groq client, constitution IV-d).
export function getStripe(): Stripe {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY env var is not set')
  _stripe = new Stripe(key, { apiVersion: '2026-08-26.dahlia' })
  return _stripe
}

export const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'https://polarisia.com.br'

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}

export function priceIdFor(plan: PaidPlanId): string {
  const id = plan === 'pro' ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_BUSINESS
  if (!id) throw new Error(`STRIPE_PRICE_${plan.toUpperCase()} env var is not set`)
  return id
}

export function planFromPriceId(priceId: string | null | undefined): PlanId {
  if (priceId && priceId === process.env.STRIPE_PRICE_PRO) return 'pro'
  if (priceId && priceId === process.env.STRIPE_PRICE_BUSINESS) return 'business'
  return 'free'
}

const toDate = (unix: number | null | undefined) => (unix ? new Date(unix * 1000) : null)

/**
 * Returns the user's Stripe customer id, creating it on first checkout. The CPF/CNPJ lives only on
 * the Stripe customer (shown on invoices, source for the NFS-e) — never in our database.
 */
export async function ensureCustomer(
  user: { id: string; email: string; name: string },
  taxId: TaxId,
): Promise<string> {
  const stripe = getStripe()
  const row = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { stripeCustomerId: true },
  })

  if (row?.stripeCustomerId) {
    const customerId = row.stripeCustomerId
    const current = await stripe.customers.listTaxIds(customerId, { limit: 10 })
    if (!current.data.some((t) => t.type === taxId.type && t.value === taxId.value)) {
      // Stripe tax IDs are immutable: replace instead of update.
      for (const t of current.data) await stripe.customers.deleteTaxId(customerId, t.id)
      await stripe.customers.createTaxId(customerId, taxId)
    }
    return customerId
  }

  // ponytail: two checkouts racing on the first click can create an orphan Stripe customer; the
  // unique index keeps our row consistent. Add a per-user lock if that ever shows up in the Dashboard.
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    tax_id_data: [taxId],
    metadata: { userId: user.id },
  })
  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: { stripeCustomerId: customer.id },
    create: { userId: user.id, plan: 'free', status: 'active', stripeCustomerId: customer.id },
  })
  return customer.id
}

export type SyncResult = {
  userId: string
  before: { status: string; cancelAt: Date | null }
  subscription: Stripe.Subscription
}

/**
 * Re-reads the subscription from Stripe and mirrors it into the owner's row. Reading the source
 * instead of the event payload makes out-of-order and repeated events harmless (research R5).
 * Returns null when the customer is not one of ours or the event is about a stale subscription.
 */
export async function syncSubscription(subscriptionId: string): Promise<SyncResult | null> {
  const s = await getStripe().subscriptions.retrieve(subscriptionId)
  const customerId = typeof s.customer === 'string' ? s.customer : s.customer.id
  const row = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId },
    select: { userId: true, status: true, cancelAt: true, stripeSubscriptionId: true },
  })
  if (!row) {
    console.warn('[stripe] subscription for unknown customer', { subscriptionId, customerId })
    return null
  }
  // After a re-subscribe, late events of the old (canceled) subscription must not clobber the new one.
  if (row.stripeSubscriptionId && row.stripeSubscriptionId !== s.id && s.status === 'canceled') {
    return null
  }

  // API basil+: billing periods live on the subscription item, not on the subscription.
  const item = s.items.data[0]
  const scheduledEnd = s.cancel_at ?? (s.cancel_at_period_end ? item?.current_period_end : null)
  await prisma.subscription.update({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: s.id,
      stripePriceId: item?.price.id ?? null,
      plan: planFromPriceId(item?.price.id),
      status: s.status,
      currentPeriodStart: toDate(item?.current_period_start),
      currentPeriodEnd: toDate(item?.current_period_end),
      startedAt: toDate(s.start_date),
      cancelAt: s.status === 'canceled' ? null : toDate(scheduledEnd),
      canceledAt: toDate(s.canceled_at),
    },
  })
  return { userId: row.userId, before: { status: row.status, cancelAt: row.cancelAt }, subscription: s }
}
