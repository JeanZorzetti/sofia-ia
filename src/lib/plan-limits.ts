/**
 * Plan limit enforcement helpers for Sofia IA.
 *
 * Plans:
 *   free     — 2 agents, 100 msgs/month, 1 KB
 *   pro      — 20 agents, 5,000 msgs/month, 10 KBs
 *   business — unlimited
 */

import { prisma } from '@/lib/prisma'
import { PLANS, type PlanId } from '@/lib/mercadopago'

export type LimitType = 'agents' | 'messages' | 'knowledge_bases'

export interface LimitCheckResult {
  allowed: boolean
  current: number
  limit: number
  plan: PlanId
  message?: string
}

/**
 * Get the active plan for a user.
 * Falls back to 'free' if no subscription exists.
 */
export async function getUserPlan(userId: string): Promise<PlanId> {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { userId },
      select: { plan: true, status: true },
    })

    if (!sub || sub.status === 'canceled' || sub.status === 'past_due') {
      return 'free'
    }

    const plan = sub.plan as PlanId
    if (!PLANS[plan]) return 'free'

    return plan
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

  const [agentCount, kbCount, sub] = await Promise.all([
    prisma.agent.count({ where: { createdBy: userId } }),
    prisma.knowledgeBase.count(),
    prisma.subscription.findUnique({
      where: { userId },
      select: {
        messagesUsedMonth: true,
        currentPeriodEnd: true,
        usagePeriodStart: true,
        status: true,
        mercadoPagoPaymentId: true,
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
