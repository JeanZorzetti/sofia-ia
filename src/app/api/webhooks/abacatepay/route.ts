import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  verifyWebhookSecret,
  extractPlanFromExternalId,
  type AbacatePayWebhookPayload,
} from '@/lib/abacatepay'

export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/abacatepay
 *
 * Receives payment confirmation events from AbacatePay.
 * Supported events: billing.paid
 *
 * Verification: webhookSecret query param
 * Example: POST /api/webhooks/abacatepay?webhookSecret=<secret>
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook secret
    const { searchParams } = new URL(request.url)
    const receivedSecret = searchParams.get('webhookSecret') || ''

    if (!verifyWebhookSecret(receivedSecret)) {
      console.warn('[AbacatePay Webhook] Invalid webhook secret')
      return NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401 }
      )
    }

    // 2. Parse payload
    const payload = (await request.json()) as AbacatePayWebhookPayload

    console.log('[AbacatePay Webhook] Event received:', payload.event, {
      id: payload.id,
      devMode: payload.devMode,
    })

    // 3. Handle billing.paid event
    if (payload.event === 'billing.paid') {
      const billing = payload.data?.billing
      if (!billing) {
        return NextResponse.json(
          { error: 'Missing billing data in payload' },
          { status: 400 }
        )
      }

      const billingId = billing.id
      const customerId = billing.customer?.id
      const customerEmail = billing.customer?.metadata?.email

      // Determine the plan from product externalId
      // The billing object may have a products array in some versions
      // We rely on the billing ID prefix or customer email to find the user
      const externalId = `sofia-${billing.frequency?.toLowerCase()}`
      // Try to extract plan from billing URL or other fields
      // Fallback: get from billing.products if available
      const products = (billing as any).products as Array<{ externalId: string }> | undefined
      const firstProductId = products?.[0]?.externalId || externalId
      const plan = extractPlanFromExternalId(firstProductId)

      // 4. Find subscription by abacatePayBillingId or by customer email
      let subscription = await prisma.subscription.findFirst({
        where: {
          OR: [
            { abacatePayBillingId: billingId },
            ...(customerEmail
              ? [{
                  user: {
                    email: customerEmail,
                  },
                }]
              : []),
          ],
        },
        include: { user: true },
      })

      if (!subscription && !customerEmail) {
        console.warn('[AbacatePay Webhook] Cannot identify user for billing:', billingId)
        // Acknowledge to prevent retries
        return NextResponse.json({ received: true, skipped: true })
      }

      // 5. Calculate period dates
      const now = new Date()
      const periodEnd = new Date(now)
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      if (subscription) {
        // Update existing subscription
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            plan,
            status: 'active',
            abacatePayBillingId: billingId,
            abacatePayCustomerId: customerId || subscription.abacatePayCustomerId,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            // Reset monthly usage on payment
            messagesUsedMonth: 0,
            usagePeriodStart: now,
          },
        })
        console.log(
          `[AbacatePay Webhook] Updated subscription for user ${subscription.userId} -> plan: ${plan}`
        )
      } else {
        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: customerEmail! },
        })

        if (!user) {
          console.warn(
            '[AbacatePay Webhook] No user found for email:',
            customerEmail
          )
          return NextResponse.json({ received: true, skipped: true })
        }

        // Create or upsert subscription
        await prisma.subscription.upsert({
          where: { userId: user.id },
          update: {
            plan,
            status: 'active',
            abacatePayBillingId: billingId,
            abacatePayCustomerId: customerId || null,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            messagesUsedMonth: 0,
            usagePeriodStart: now,
          },
          create: {
            userId: user.id,
            plan,
            status: 'active',
            abacatePayBillingId: billingId,
            abacatePayCustomerId: customerId || null,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        })
        console.log(
          `[AbacatePay Webhook] Created subscription for user ${user.id} -> plan: ${plan}`
        )
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[AbacatePay Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
