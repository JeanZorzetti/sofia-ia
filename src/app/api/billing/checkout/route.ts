import { createHash, randomInt } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isPaid } from '@/lib/plan-limits'
import { appUrl, ensureCustomer, getStripe, priceIdFor } from '@/lib/stripe'
import { parseTaxId } from '@/lib/tax-id'
import { CURRENT_TERMS_VERSION, TERMS } from '@/lib/terms'

export const dynamic = 'force-dynamic'

const fail = (status: number, error: string) => NextResponse.json({ success: false, error }, { status })
// Stripe asks for a label with an 8-letter random suffix to compare checkout flows in the Dashboard.
const randomLetters = () => Array.from({ length: 8 }, () => String.fromCharCode(97 + randomInt(26))).join('')

/**
 * POST /api/billing/checkout — spec 013, contracts/billing-api.md.
 * Body: { plan: 'pro' | 'business', taxId: string, acceptedTermsVersion: string }
 * Records the versioned terms acceptance, ensures the Stripe customer (with CPF/CNPJ) and returns
 * the hosted Checkout URL. The plan only changes when the webhook confirms the payment.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return fail(401, 'Unauthorized')

    const body = (await request.json().catch(() => ({}))) as {
      plan?: string
      taxId?: string
      acceptedTermsVersion?: string
    }
    const plan = body.plan
    if (plan !== 'pro' && plan !== 'business') return fail(400, 'invalid_plan')
    const taxId = parseTaxId(String(body.taxId ?? ''))
    if (!taxId) return fail(400, 'invalid_tax_id')
    if (body.acceptedTermsVersion !== CURRENT_TERMS_VERSION) return fail(400, 'terms_not_accepted')

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        id: true,
        email: true,
        name: true,
        subscription: { select: { plan: true, status: true, stripeSubscriptionId: true } },
      },
    })
    if (!user) return fail(401, 'Unauthorized')
    if (isPaid(user.subscription)) return fail(409, 'already_subscribed')

    await prisma.termsAcceptance.create({
      data: {
        userId: user.id,
        version: CURRENT_TERMS_VERSION,
        contentHash: createHash('sha256').update(JSON.stringify(TERMS[CURRENT_TERMS_VERSION])).digest('hex'),
        ip: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || null,
        userAgent: request.headers.get('user-agent'),
      },
    })

    const customerId = await ensureCustomer(user, taxId)
    // No payment_method_types (dynamic methods from the Dashboard) and no automatic_tax (research R15).
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceIdFor(plan), quantity: 1 }],
      success_url: `${appUrl()}/dashboard/billing?checkout=success`,
      cancel_url: `${appUrl()}/dashboard/billing?checkout=canceled`,
      locale: 'pt-BR',
      integration_identifier: `polaris-checkout-${randomLetters()}`,
    })

    return NextResponse.json({ success: true, data: { url: session.url } })
  } catch (error) {
    console.error('[billing checkout]', error)
    return fail(500, 'checkout_failed')
  }
}
