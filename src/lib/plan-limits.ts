/**
 * Plan limit enforcement helpers for Polaris IA.
 *
 * Plans:
 *   free     — 2 agents, 100 msgs/month, 1 KB
 *   pro      — 20 agents, 5,000 msgs/month, 10 KBs
 *   business — unlimited
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PLANS, type PlanId } from '@/lib/plans'

export type LimitType = 'agents' | 'messages' | 'knowledge_bases'

export interface LimitCheckResult {
  allowed: boolean
  current: number
  limit: number
  plan: PlanId
  message?: string
}

export const TRIAL_DAYS = 7
// past_due keeps the plan during the 7-day grace period (spec 013 FR-013); Stripe cancels after.
const PAID_STATUS_LIST = ['active', 'past_due']
const PAID_STATUSES = new Set(PAID_STATUS_LIST)

/** Prisma filter for "paying customer" — the same rule as isPaid(), for counts and dashboards. */
export const PAID_SUBSCRIPTION_WHERE = {
  stripeSubscriptionId: { not: null },
  status: { in: PAID_STATUS_LIST },
} satisfies Prisma.SubscriptionWhereInput

type SubPlanFields = { plan: string; status: string; stripeSubscriptionId: string | null }

export function trialEndsAt(userCreatedAt: Date): Date {
  return new Date(userCreatedAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
}

// CDC art. 49: full refund if the customer withdraws within 7 days of the first charge.
export const WITHDRAWAL_DAYS = 7

export function withdrawalEndsAt(startedAt: Date): Date {
  return new Date(startedAt.getTime() + WITHDRAWAL_DAYS * 24 * 60 * 60 * 1000)
}

export function isPaid(sub: SubPlanFields | null | undefined): boolean {
  return !!sub?.stripeSubscriptionId && PAID_STATUSES.has(sub.status)
}

/**
 * The single plan rule (spec 013, research R4):
 * paid Stripe subscription → its plan; otherwise a 7-day Pro trial counted from signup
 * (every signup path, no card); otherwise free. Legacy Mercado Pago rows are ignored.
 */
export function resolvePlan({
  sub,
  userCreatedAt,
  now = new Date(),
}: {
  sub: SubPlanFields | null | undefined
  userCreatedAt: Date | null | undefined
  now?: Date
}): PlanId {
  if (isPaid(sub) && sub!.plan !== 'free' && sub!.plan in PLANS) return sub!.plan as PlanId
  if (userCreatedAt && now < trialEndsAt(userCreatedAt)) return 'pro'
  return 'free'
}

export async function getUserPlan(userId: string): Promise<PlanId> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        createdAt: true,
        subscription: { select: { plan: true, status: true, stripeSubscriptionId: true } },
      },
    })
    return resolvePlan({ sub: user?.subscription, userCreatedAt: user?.createdAt })
  } catch {
    return 'free'
  }
}

/**
 * Ensure the user's monthly message usage period is current.
 * Resets counter if more than 30 days have passed since usagePeriodStart.
 */
async function ensureUsagePeriodCurrent(userId: string): Promise<void> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { id: true, usagePeriodStart: true },
  })
  if (!sub) return

  const now = new Date()
  const periodStart = sub.usagePeriodStart
  const diffDays = (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)

  if (diffDays >= 30) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        messagesUsedMonth: 0,
        usagePeriodStart: now,
      },
    })
  }
}

/**
 * Increment message usage counter for a user.
 * Creates a free subscription record if none exists.
 */
export async function incrementMessageUsage(userId: string): Promise<void> {
  try {
    // Ensure subscription exists
    const sub = await prisma.subscription.findUnique({ where: { userId } })
    if (!sub) {
      await prisma.subscription.create({
        data: { userId, plan: 'free', status: 'active' },
      })
    } else {
      await ensureUsagePeriodCurrent(userId)
    }

    await prisma.subscription.update({
      where: { userId },
      data: { messagesUsedMonth: { increment: 1 } },
    })
  } catch (err) {
    console.error('[plan-limits] Failed to increment message usage:', err)
  }
}

/**
 * Check if a user is within the allowed limit for a given resource type.
 *
 * @param userId - The user's ID
 * @param type   - 'agents' | 'messages' | 'knowledge_bases'
 * @returns LimitCheckResult with allowed boolean and context data
 */
export async function checkPlanLimit(
  userId: string,
  type: LimitType
): Promise<LimitCheckResult> {
  const plan = await getUserPlan(userId)
  const planData = PLANS[plan]

  if (type === 'agents') {
    const limit = planData.maxAgents
    const current = await prisma.agent.count({ where: { createdBy: userId } })

    if (limit === -1) {
      return { allowed: true, current, limit: -1, plan }
    }

    const allowed = current < limit
    return {
      allowed,
      current,
      limit,
      plan,
      message: allowed
        ? undefined
        : `Limite de agentes atingido para o plano ${planData.name}. Faça upgrade para criar mais agentes.`,
    }
  }

  if (type === 'messages') {
    const limit = planData.maxMessagesPerMonth

    if (limit === -1) {
      return { allowed: true, current: 0, limit: -1, plan }
    }

    // Ensure period is current before checking
    await ensureUsagePeriodCurrent(userId)

    const sub = await prisma.subscription.findUnique({
      where: { userId },
      select: { messagesUsedMonth: true },
    })
    const current = sub?.messagesUsedMonth ?? 0

    const allowed = current < limit
    return {
      allowed,
      current,
      limit,
      plan,
      message: allowed
        ? undefined
        : `Limite de mensagens mensais atingido para o plano ${planData.name}. Faça upgrade para continuar.`,
    }
  }

  if (type === 'knowledge_bases') {
    const limit = planData.maxKnowledgeBases
    const current = await prisma.knowledgeBase.count()

    if (limit === -1) {
      return { allowed: true, current, limit: -1, plan }
    }

    const allowed = current < limit
    return {
      allowed,
      current,
      limit,
      plan,
      message: allowed
        ? undefined
        : `Limite de bases de conhecimento atingido para o plano ${planData.name}. Faça upgrade para adicionar mais.`,
    }
  }

  // Unreachable but TypeScript needs a return
  return { allowed: true, current: 0, limit: -1, plan }
}

/**
 * Get a summary of the current usage for all limit types.
 */
export async function getUsageSummary(userId: string) {
  const plan = await getUserPlan(userId)
  const planData = PLANS[plan]

  // Ensure period is current
  await ensureUsagePeriodCurrent(userId)

  // Count KBs linked to agents of this user (KnowledgeBase has no direct userId field)
  const userAgentIds = await prisma.agent
    .findMany({ where: { createdBy: userId }, select: { id: true } })
    .then(rows => rows.map(r => r.id))

  const [agentCount, kbCount, sub] = await Promise.all([
    prisma.agent.count({ where: { createdBy: userId } }),
    prisma.knowledgeBase.count({ where: { agentId: { in: userAgentIds } } }),
    prisma.subscription.findUnique({
      where: { userId },
      select: {
        messagesUsedMonth: true,
        currentPeriodEnd: true,
        usagePeriodStart: true,
        status: true,
      },
    }),
  ])

  return {
    plan,
    planData,
    agents: {
      current: agentCount,
      limit: planData.maxAgents,
      percentage:
        planData.maxAgents === -1 ? 0 : (agentCount / planData.maxAgents) * 100,
    },
    messages: {
      current: sub?.messagesUsedMonth ?? 0,
      limit: planData.maxMessagesPerMonth,
      percentage:
        planData.maxMessagesPerMonth === -1
          ? 0
          : ((sub?.messagesUsedMonth ?? 0) / planData.maxMessagesPerMonth) * 100,
    },
    knowledgeBases: {
      current: kbCount,
      limit: planData.maxKnowledgeBases,
      percentage:
        planData.maxKnowledgeBases === -1
          ? 0
          : (kbCount / planData.maxKnowledgeBases) * 100,
    },
    subscription: sub,
  }
}
