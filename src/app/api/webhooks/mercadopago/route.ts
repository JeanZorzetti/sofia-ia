import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  verifyWebhookSignature,
  extractPlanFromExternalRef,
  extractUserIdFromExternalRef,
  mapPaymentStatus,
  mapSubscriptionStatus,
  getPayment,
} from '@/lib/mercadopago'
import { PreApproval, MercadoPagoConfig } from 'mercadopago'
import { trackEvent } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/mercadopago
 *
 * Recebe eventos de pagamento e assinatura do Mercado Pago.
 *
 * Tipos relevantes:
 *   type=payment               → pagamento aprovado (Checkout Pro)
 *   type=subscription_preapproval → assinatura recorrente atualizada
 *
 * Verificação: header x-signature + x-request-id (HMAC-SHA256)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || ''
    const dataId = searchParams.get('data.id') || ''

    // Ler body como texto para verificação e parse
    const bodyText = await request.text()
    let body: Record<string, unknown> = {}
    try {
      body = JSON.parse(bodyText)
    } catch {
      // body pode estar vazio em algumas notificações
    }

    // Extrair tipo e id do body se não vieram na query
    const eventType = type || (body.type as string) || ''
    const eventDataId =
      dataId ||
      ((body.data as Record<string, unknown>)?.id as string) ||
      ''

    console.log('[MP Webhook] Evento recebido:', { eventType, eventDataId })

    // Verificar assinatura (skip em dev sem secret configurado)
    const xSignature = request.headers.get('x-signature') || ''
    const xRequestId = request.headers.get('x-request-id') || ''

    if (xSignature && eventDataId) {
      const isValid = verifyWebhookSignature({
        xSignature,
        xRequestId,
        dataId: eventDataId,
      })
      if (!isValid) {
        console.warn('[MP Webhook] Assinatura inválida')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    // ── Pagamento único (Checkout Pro) ────────────────────
    if (eventType === 'payment' && eventDataId) {
      await handlePaymentEvent(eventDataId)
    }

    // ── Assinatura recorrente (PreApproval) ───────────────
    if (eventType === 'subscription_preapproval' && eventDataId) {
      await handleSubscriptionEvent(eventDataId)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[MP Webhook] Erro:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// ─── Handlers ─────────────────────────────────────────────

async function handlePaymentEvent(paymentId: string) {
  try {
    const payment = await getPayment(paymentId)

    const status = payment.status as string
    const externalRef = payment.external_reference || ''

    if (!externalRef) {
      console.warn('[MP Webhook] payment sem external_reference:', paymentId)
      return
    }

    const userId = extractUserIdFromExternalRef(externalRef)
    const plan = extractPlanFromExternalRef(externalRef)
    const internalStatus = mapPaymentStatus(status)

    console.log('[MP Webhook] payment:', { paymentId, status, userId, plan, internalStatus })

    if (internalStatus !== 'active') {
      // Atualiza status mas não altera plano
      await prisma.subscription.updateMany({
        where: { userId },
        data: { status: internalStatus },
      })
      return
    }

    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    await prisma.subscription.upsert({
      where: { userId },
      update: {
        plan,
        status: 'active',
        mercadoPagoPaymentId: paymentId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        messagesUsedMonth: 0,
        usagePeriodStart: now,
      },
      create: {
        userId,
        plan,
        status: 'active',
        mercadoPagoPaymentId: paymentId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    })

    // Track plan upgrade event (fire and forget)
    trackEvent('plan_upgrade_completed', userId, { plan, paymentId, source: 'payment' }).catch(() => {})

    console.log(`[MP Webhook] Subscription atualizada: user=${userId} plan=${plan}`)
  } catch (err) {
    console.error('[MP Webhook] Erro ao processar payment:', err)
  }
}

async function handleSubscriptionEvent(subscriptionId: string) {
  try {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!token) throw new Error('MERCADOPAGO_ACCESS_TOKEN not set')

    const client = new MercadoPagoConfig({ accessToken: token })
    const preApproval = new PreApproval(client)
    const sub = await preApproval.get({ id: subscriptionId })

    const status = sub.status as string
    const externalRef = sub.external_reference || ''

    if (!externalRef) {
      console.warn('[MP Webhook] preapproval sem external_reference:', subscriptionId)
      return
    }

    const userId = extractUserIdFromExternalRef(externalRef)
    const plan = extractPlanFromExternalRef(externalRef)
    const internalStatus = mapSubscriptionStatus(status)

    console.log('[MP Webhook] subscription_preapproval:', { subscriptionId, status, userId, plan, internalStatus })

    if (internalStatus !== 'active') {
      await prisma.subscription.updateMany({
        where: { userId },
        data: {
          status: internalStatus,
          mercadoPagoSubscriptionId: subscriptionId,
        },
      })
      return
    }

    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    await prisma.subscription.upsert({
      where: { userId },
      update: {
        plan,
        status: 'active',
        mercadoPagoSubscriptionId: subscriptionId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        messagesUsedMonth: 0,
        usagePeriodStart: now,
      },
      create: {
        userId,
        plan,
        status: 'active',
        mercadoPagoSubscriptionId: subscriptionId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    })

    // Track plan upgrade event (fire and forget)
    trackEvent('plan_upgrade_completed', userId, { plan, subscriptionId, source: 'subscription_preapproval' }).catch(() => {})

    console.log(`[MP Webhook] Assinatura ativada: user=${userId} plan=${plan}`)
  } catch (err) {
    console.error('[MP Webhook] Erro ao processar subscription_preapproval:', err)
  }
}
