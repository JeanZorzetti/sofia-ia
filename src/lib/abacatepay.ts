/**
 * AbacatePay integration — REST API client
 * Docs: https://docs.abacatepay.com
 *
 * Supports: PIX, Cartao
 * Auth: Bearer token via ABACATEPAY_API_KEY env var
 */

const ABACATEPAY_BASE_URL = 'https://api.abacatepay.com/v1'

function getApiKey(): string {
  const key = process.env.ABACATEPAY_API_KEY
  if (!key) throw new Error('ABACATEPAY_API_KEY env var is not set')
  return key
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${ABACATEPAY_BASE_URL}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
      ...(options.headers || {}),
    },
  })

  const json = await res.json()

  if (!res.ok) {
    throw new Error(
      `AbacatePay API error ${res.status}: ${json?.error || JSON.stringify(json)}`
    )
  }

  return json as T
}

// ─── Types ───────────────────────────────────────────────

export type AbacatePayFrequency = 'ONE_TIME' | 'MONTHLY' | 'YEARLY'
export type AbacatePayMethod = 'PIX' | 'CREDIT_CARD'
export type AbacatePayBillingStatus =
  | 'PENDING'
  | 'PAID'
  | 'CANCELED'
  | 'EXPIRED'
  | 'OVERDUE'

export interface AbacatePayProduct {
  externalId: string
  name: string
  quantity: number
  price: number // in centavos (BRL cents)
}

export interface AbacatePayCustomerInput {
  name: string
  email: string
  cellphone?: string
  taxId?: string // CPF/CNPJ
}

export interface AbacatePayBillingInput {
  frequency: AbacatePayFrequency
  methods: AbacatePayMethod[]
  products: AbacatePayProduct[]
  returnUrl: string
  completionUrl?: string
  customer?: AbacatePayCustomerInput
  customerId?: string
}

export interface AbacatePayBilling {
  id: string
  url: string
  amount: number
  status: AbacatePayBillingStatus
  methods: AbacatePayMethod[]
  frequency: AbacatePayFrequency
  devMode: boolean
  customer?: {
    id: string
    metadata: Record<string, string>
  }
  nextBilling?: string | null
  createdAt: string
  updatedAt: string
}

export interface AbacatePayCustomer {
  id: string
  metadata: {
    name: string
    email: string
    cellphone?: string
    taxId?: string
  }
  createdAt: string
  updatedAt: string
}

export interface AbacatePayWebhookPayload {
  id: string
  event: 'billing.paid' | 'withdraw.done' | 'withdraw.failed'
  devMode: boolean
  data: {
    billing?: AbacatePayBilling
    amount?: number
    fee?: number
    method?: string
  }
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
    priceInCents: 29700,   // R$ 297,00
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
    priceInCents: 99700,   // R$ 997,00
    priceBRL: 997,
    maxAgents: -1,           // unlimited
    maxMessagesPerMonth: -1, // unlimited
    maxKnowledgeBases: -1,   // unlimited
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

export type PlanId = keyof typeof PLANS

// ─── API Methods ──────────────────────────────────────────

/**
 * Create a checkout billing for a given plan.
 * Returns the URL to redirect the user for payment.
 */
export async function createBilling(
  plan: Exclude<PlanId, 'free'>,
  userEmail: string,
  userName: string,
  returnUrl: string,
  completionUrl?: string
): Promise<AbacatePayBilling> {
  const planData = PLANS[plan]

  const payload: AbacatePayBillingInput = {
    frequency: 'MONTHLY',
    methods: ['PIX', 'CREDIT_CARD'],
    products: [
      {
        externalId: `sofia-${plan}-monthly`,
        name: `Sofia IA — Plano ${planData.name}`,
        quantity: 1,
        price: planData.priceInCents,
      },
    ],
    returnUrl,
    completionUrl: completionUrl || returnUrl,
    customer: {
      name: userName,
      email: userEmail,
    },
  }

  const response = await apiFetch<{ data: AbacatePayBilling; error: string | null }>(
    '/billing/create',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )

  return response.data
}

/**
 * Get billing details by ID.
 */
export async function getBilling(billingId: string): Promise<AbacatePayBilling> {
  const response = await apiFetch<{ data: AbacatePayBilling; error: string | null }>(
    `/billing/get?id=${billingId}`
  )
  return response.data
}

/**
 * Create a customer in AbacatePay.
 */
export async function createCustomer(
  input: AbacatePayCustomerInput
): Promise<AbacatePayCustomer> {
  const response = await apiFetch<{ data: AbacatePayCustomer; error: string | null }>(
    '/customer/create',
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  )
  return response.data
}

/**
 * Verify an incoming AbacatePay webhook.
 * Uses the webhookSecret query param method.
 */
export function verifyWebhookSecret(receivedSecret: string): boolean {
  const expectedSecret = process.env.ABACATEPAY_WEBHOOK_SECRET
  if (!expectedSecret) {
    console.warn('ABACATEPAY_WEBHOOK_SECRET not set — skipping verification in dev mode')
    return true // allow in dev if not configured
  }
  return receivedSecret === expectedSecret
}

/**
 * Map AbacatePay billing status to our internal subscription status.
 */
export function mapBillingStatusToSubStatus(
  billingStatus: AbacatePayBillingStatus
): string {
  switch (billingStatus) {
    case 'PAID':
      return 'active'
    case 'PENDING':
      return 'pending'
    case 'CANCELED':
      return 'canceled'
    case 'EXPIRED':
    case 'OVERDUE':
      return 'past_due'
    default:
      return 'active'
  }
}

/**
 * Extract plan from externalId (e.g. "sofia-pro-monthly" -> "pro")
 */
export function extractPlanFromExternalId(externalId: string): PlanId {
  if (externalId.includes('business')) return 'business'
  if (externalId.includes('pro')) return 'pro'
  return 'free'
}
