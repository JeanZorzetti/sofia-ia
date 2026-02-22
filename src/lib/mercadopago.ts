/**
 * Mercado Pago integration — SDK client
 * Docs: https://www.mercadopago.com.br/developers/pt/docs
 *
 * Supports: Cartao de credito, PIX, boleto via Checkout Pro
 * Auth: Access token via MERCADOPAGO_ACCESS_TOKEN env var
 */

import {
  MercadoPagoConfig,
  Preference,
  PreApproval,
  Payment,
} from 'mercadopago'

// ─── Lazy client init ─────────────────────────────────────

let _client: MercadoPagoConfig | null = null

function getClient(): MercadoPagoConfig {
  if (_client) return _client
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!token) throw new Error('MERCADOPAGO_ACCESS_TOKEN env var is not set')
  _client = new MercadoPagoConfig({ accessToken: token, options: { timeout: 10000 } })
  return _client
}

// ─── Types ───────────────────────────────────────────────

export type PlanId = 'free' | 'pro' | 'business'

export interface CheckoutResult {
  id: string
  checkoutUrl: string
}

export interface SubscriptionResult {
  id: string
  checkoutUrl: string
}

// ─── Plan definitions ─────────────────────────────────────

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    priceInCents: 0,
    priceBRL: 0,
    maxAgents: 2,
    maxMessagesPerMonth: 100,
    maxKnowledgeBases: 1,
    features: [
      '2 agentes de IA',
      '100 mensagens/mês',
      '1 base de conhecimento',
      'Suporte por email',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceInCents: 29700,
    priceBRL: 297,
    maxAgents: 20,
    maxMessagesPerMonth: 5000,
    maxKnowledgeBases: 10,
    features: [
      '20 agentes de IA',
      '5.000 mensagens/mês',
      '10 bases de conhecimento',
      'Orquestrações avançadas',
      'Analytics em tempo real',
      'Suporte prioritário',
    ],
  },
  business: {
    id: 'business',
    name: 'Business',
    priceInCents: 99700,
    priceBRL: 997,
    maxAgents: -1,
    maxMessagesPerMonth: -1,
    maxKnowledgeBases: -1,
    features: [
      'Agentes ilimitados',
      'Mensagens ilimitadas',
      'KBs ilimitadas',
      'API dedicada',
      'Suporte 24/7',
      'Gerente de conta',
      'SLA garantido',
    ],
  },
} as const

// ─── Helpers ──────────────────────────────────────────────

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://sofiaia.roilabs.com.br'
  )
}

function getWebhookUrl(): string {
  return `${getAppUrl()}/api/webhooks/mercadopago`
}

// ─── Checkout Pro (pagamento único — fallback simples) ────

/**
 * Cria uma Preference de Checkout Pro para o plano informado.
 * Útil como fallback simples caso a assinatura recorrente falhe.
 */
export async function createCheckoutPreference(
  plan: Exclude<PlanId, 'free'>,
  user: { id: string; email: string; name: string },
  returnUrl: string
): Promise<CheckoutResult> {
  const planData = PLANS[plan]
  const client = getClient()
  const preference = new Preference(client)

  const result = await preference.create({
    body: {
      items: [
        {
          id: `sofia-${plan}-monthly`,
          title: `Sofia IA — Plano ${planData.name}`,
          quantity: 1,
          unit_price: planData.priceBRL,
          currency_id: 'BRL',
        },
      ],
      payer: {
        email: user.email,
        name: user.name,
      },
      back_urls: {
        success: `${returnUrl}?success=1&plan=${plan}`,
        failure: `${returnUrl}?error=1`,
        pending: `${returnUrl}?pending=1&plan=${plan}`,
      },
      auto_return: 'approved',
      external_reference: `${user.id}:${plan}`,
      notification_url: getWebhookUrl(),
    },
  })

  const checkoutUrl =
    process.env.NODE_ENV === 'production'
      ? (result.init_point ?? '')
      : (result.sandbox_init_point ?? result.init_point ?? '')

  return {
    id: result.id ?? '',
    checkoutUrl,
  }
}

// ─── Preapproval (assinatura recorrente) ──────────────────

/**
 * Cria uma assinatura recorrente (PreApproval) no Mercado Pago.
 * Este é o método principal para planos mensais.
 */
export async function createSubscription(
  plan: Exclude<PlanId, 'free'>,
  user: { id: string; email: string; name: string },
  returnUrl: string
): Promise<SubscriptionResult> {
  const planData = PLANS[plan]
  const client = getClient()
  const preApproval = new PreApproval(client)

  const result = await preApproval.create({
    body: {
      payer_email: user.email,
      reason: `Sofia IA — Plano ${planData.name}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: planData.priceBRL,
        currency_id: 'BRL',
      },
      back_url: `${returnUrl}?success=1&plan=${plan}`,
      status: 'pending',
      external_reference: `${user.id}:${plan}`,
    },
  })

  return {
    id: result.id ?? '',
    checkoutUrl: result.init_point ?? '',
  }
}

// ─── Payment lookup ───────────────────────────────────────

/**
 * Busca um pagamento pelo ID na API do Mercado Pago.
 */
export async function getPayment(paymentId: string | number) {
  const client = getClient()
  const payment = new Payment(client)
  return payment.get({ id: Number(paymentId) })
}

// ─── Webhook verification ─────────────────────────────────

/**
 * Valida a assinatura do webhook do Mercado Pago.
 * O MP envia o header x-signature com formato:
 *   ts=<timestamp>,v1=<hmac_sha256>
 *
 * A string assinada é: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 */
export function verifyWebhookSignature(params: {
  xSignature: string
  xRequestId: string
  dataId: string
}): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret) {
    console.warn('[MP Webhook] MERCADOPAGO_WEBHOOK_SECRET not set — skipping in dev mode')
    return true
  }

  try {
    const { xSignature, xRequestId, dataId } = params

    // Parse ts and v1 from header: "ts=1234,v1=abc..."
    const parts = xSignature.split(',')
    const tsPart = parts.find((p) => p.startsWith('ts='))
    const v1Part = parts.find((p) => p.startsWith('v1='))

    if (!tsPart || !v1Part) return false

    const ts = tsPart.split('=')[1]
    const v1 = v1Part.split('=')[1]

    const signedTemplate = `id:${dataId};request-id:${xRequestId};ts:${ts};`

    const crypto = require('crypto') as typeof import('crypto')
    const expectedHmac = crypto
      .createHmac('sha256', secret)
      .update(signedTemplate)
      .digest('hex')

    return expectedHmac === v1
  } catch {
    return false
  }
}

// ─── Status mapping ───────────────────────────────────────

/**
 * Mapeia status de pagamento/assinatura do MP para o status interno.
 */
export function mapPaymentStatus(
  status: string | null | undefined
): 'active' | 'pending' | 'canceled' | 'past_due' {
  switch (status) {
    case 'approved':
    case 'authorized':
    case 'authorized_pending_capture':
      return 'active'
    case 'pending':
    case 'in_process':
    case 'in_mediation':
      return 'pending'
    case 'cancelled':
    case 'refunded':
    case 'charged_back':
      return 'canceled'
    case 'rejected':
      return 'past_due'
    default:
      return 'pending'
  }
}

export function mapSubscriptionStatus(
  status: string | null | undefined
): 'active' | 'pending' | 'canceled' | 'past_due' {
  switch (status) {
    case 'authorized':
      return 'active'
    case 'pending':
      return 'pending'
    case 'paused':
      return 'past_due'
    case 'cancelled':
      return 'canceled'
    default:
      return 'pending'
  }
}

/**
 * Extrai planId do external_reference (formato "userId:planId").
 */
export function extractPlanFromExternalRef(externalRef: string): PlanId {
  const parts = externalRef.split(':')
  const planPart = parts[1] || ''
  if (planPart === 'pro') return 'pro'
  if (planPart === 'business') return 'business'
  return 'free'
}

/**
 * Extrai userId do external_reference (formato "userId:planId").
 */
export function extractUserIdFromExternalRef(externalRef: string): string {
  return externalRef.split(':')[0] || ''
}
