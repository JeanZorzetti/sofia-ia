import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { createSubscription, PLANS, type PlanId } from '@/lib/mercadopago'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/checkout
 * Cria uma assinatura recorrente no Mercado Pago (PreApproval) para upgrade de plano.
 *
 * Body: { plan: 'pro' | 'business' }
 * Returns: { checkoutUrl: string, paymentId: string }
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

    // Buscar dados completos do usuario
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true },
    })

    const returnUrl =
      process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`
        : 'https://sofiaia.roilabs.com.br/dashboard/billing'

    const subscription = await createSubscription(
      plan as Exclude<PlanId, 'free'>,
      {
        id: user.id,
        email: dbUser?.email || user.email,
        name: dbUser?.name || user.name,
      },
      returnUrl
    )

    // Salvar ID da assinatura pendente no DB
    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {
        mercadoPagoSubscriptionId: subscription.id,
      },
      create: {
        userId: user.id,
        plan: 'free',
        status: 'pending',
        mercadoPagoSubscriptionId: subscription.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        checkoutUrl: subscription.checkoutUrl,
        paymentId: subscription.id,
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal error'
    console.error('[billing/checkout POST]', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
