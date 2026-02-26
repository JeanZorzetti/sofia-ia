import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// ─── Event Catalog ─────────────────────────────────────────────────────────────
// AARRR funnel: Acquisition → Activation → Revenue → Retention → Referral

export type AnalyticsEventName =
  // Acquisition
  | 'signup'                         // { method: 'email' | 'google' | 'invite' }
  // Activation
  | 'onboarding_step_completed'      // { step: 1|2|3|4, stepName: string }
  | 'onboarding_complete'
  | 'first_agent_created'            // { method: 'manual' | 'magic_create' }
  | 'first_orchestration_created'
  | 'first_orchestration_executed'   // { templateId?: string }
  | 'first_kb_created'
  // Engagement
  | 'agent_created'                  // { method: 'manual' | 'magic_create' }
  | 'orchestration_created'          // { agentCount: number }
  | 'orchestration_executed'         // { orchestrationId, status, durationMs?, tokensUsed? }
  | 'kb_created'
  | 'kb_document_added'              // { type: 'text'|'url'|'file', fileType? }
  | 'api_key_created'
  | 'webhook_saved'                  // { count: number }
  | 'schedule_created'               // { cronExpr: string }
  // Revenue
  | 'plan_limit_hit'                 // { resource: 'agents'|'messages'|'kbs', current, limit }
  | 'upgrade_prompt_viewed'          // { source: string, fromPlan: string }
  | 'plan_upgrade_started'           // { fromPlan: string, toPlan: string, source?: string }
  | 'plan_upgrade_completed'         // { plan: string, amount: number, paymentMethod: string }
  | 'checkout_started'               // { plan: string, amount: number }
  | 'checkout_completed'             // { plan: string, amount: number }
  // Retention / Referral
  | 'template_cloned'                // { templateId: string, templateName: string }
  | 'result_shared'                  // { executionId: string }
  | 'nps_submitted'                  // { score: number, comment?: string }
  // Email drip tracking (sent markers — prevent duplicates)
  | 'drip_d1_sent'
  | 'drip_d3_sent'
  | 'drip_d5_sent'
  | 'drip_d7_sent'
  | 'drip_d14_sent'
  | 'drip_d30_sent'
  | 'weekly_digest_sent'

/** Typed event constants to avoid raw string usage */
export const Events = {
  SIGNUP: 'signup',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  FIRST_AGENT_CREATED: 'first_agent_created',
  FIRST_ORCHESTRATION_CREATED: 'first_orchestration_created',
  FIRST_ORCHESTRATION_EXECUTED: 'first_orchestration_executed',
  FIRST_KB_CREATED: 'first_kb_created',
  AGENT_CREATED: 'agent_created',
  ORCHESTRATION_CREATED: 'orchestration_created',
  ORCHESTRATION_EXECUTED: 'orchestration_executed',
  KB_CREATED: 'kb_created',
  KB_DOCUMENT_ADDED: 'kb_document_added',
  API_KEY_CREATED: 'api_key_created',
  WEBHOOK_SAVED: 'webhook_saved',
  SCHEDULE_CREATED: 'schedule_created',
  PLAN_LIMIT_HIT: 'plan_limit_hit',
  UPGRADE_PROMPT_VIEWED: 'upgrade_prompt_viewed',
  PLAN_UPGRADE_STARTED: 'plan_upgrade_started',
  PLAN_UPGRADE_COMPLETED: 'plan_upgrade_completed',
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_COMPLETED: 'checkout_completed',
  TEMPLATE_CLONED: 'template_cloned',
  RESULT_SHARED: 'result_shared',
  NPS_SUBMITTED: 'nps_submitted',
} as const satisfies Record<string, AnalyticsEventName>

// ─── Core tracking function ───────────────────────────────────────────────────

/**
 * Track a product analytics event.
 * Never throws — analytics must never block the main flow.
 */
export async function trackEvent(
  event: AnalyticsEventName,
  userId?: string,
  properties?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        event,
        userId: userId ?? null,
        properties: (properties ?? {}) as Prisma.InputJsonValue,
      },
    })
  } catch {
    // Silent — analytics failures must never surface to users
  }
}

/**
 * Check if this is the user's first event of a given type.
 * Useful to fire "first_X" events only once.
 * Never throws.
 */
export async function isFirstEvent(
  event: AnalyticsEventName,
  userId: string
): Promise<boolean> {
  try {
    const count = await prisma.analyticsEvent.count({
      where: { event, userId },
    })
    return count === 0
  } catch {
    return false
  }
}

// ─── Admin Metrics Helpers ────────────────────────────────────────────────────

/**
 * Returns daily signup counts for the last N days (for sparkline charts).
 * Array is ordered oldest → newest, one entry per day.
 */
export async function getDailySignups(days = 30): Promise<{ date: string; count: number }[]> {
  const since = new Date()
  since.setDate(since.getDate() - (days - 1))
  since.setHours(0, 0, 0, 0)

  const rows = await prisma.user.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  // Initialize all days to 0
  const counts: Record<string, number> = {}
  for (let i = 0; i < days; i++) {
    const d = new Date(since)
    d.setDate(d.getDate() + i)
    counts[d.toISOString().slice(0, 10)] = 0
  }

  for (const row of rows) {
    const key = row.createdAt.toISOString().slice(0, 10)
    if (key in counts) counts[key] = (counts[key] || 0) + 1
  }

  return Object.entries(counts).map(([date, count]) => ({ date, count }))
}

/**
 * Conversion funnel: signups → activated (has agent) → executed → paid
 * Returns absolute counts — rates are computed in the UI.
 */
export async function getFunnelCounts(): Promise<{
  signups: number
  withAgent: number
  withExecution: number
  paid: number
}> {
  const [signups, withAgent, withExecution, paid] = await Promise.all([
    prisma.user.count({ where: { status: 'active' } }),

    // Users with at least 1 agent created
    prisma.user.count({
      where: { status: 'active', agents: { some: {} } },
    }),

    // Users that fired first_orchestration_executed event
    prisma.analyticsEvent.groupBy({
      by: ['userId'],
      where: { event: Events.FIRST_ORCHESTRATION_EXECUTED, userId: { not: null } },
    }).then(rows => rows.length),

    // Paid subscribers (non-free active subscriptions)
    prisma.subscription.count({
      where: { status: 'active', plan: { notIn: ['free'] } },
    }),
  ])

  return { signups, withAgent, withExecution, paid }
}

/**
 * Product engagement counts — overall or since a given date.
 */
export async function getEngagementCounts(sinceDate?: Date): Promise<{
  orchestrationsExecuted: number
  agentsCreated: number
  kbsCreated: number
  documentsAdded: number
}> {
  const dateFilter = sinceDate ? { createdAt: { gte: sinceDate } } : {}

  const [orchestrationsExecuted, agentsCreated, kbsCreated, documentsAdded] = await Promise.all([
    prisma.orchestrationExecution.count({
      where: { ...dateFilter, status: 'completed' },
    }),
    prisma.agent.count({ where: dateFilter }),
    prisma.knowledgeBase.count({ where: dateFilter }),
    prisma.knowledgeDocument.count({ where: dateFilter }),
  ])

  return { orchestrationsExecuted, agentsCreated, kbsCreated, documentsAdded }
}
