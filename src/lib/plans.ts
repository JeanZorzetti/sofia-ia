// Plan catalog (client-safe: no SDK, no env). Prices and limits are shown in the UI and enforced
// by src/lib/plan-limits.ts; the Stripe price IDs live server-side in src/lib/stripe.ts.

export type PlanId = 'free' | 'pro' | 'business'
export type PaidPlanId = Exclude<PlanId, 'free'>

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
