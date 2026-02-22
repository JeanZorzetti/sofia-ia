import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export type AnalyticsEventName =
  | 'signup'
  | 'onboarding_complete'
  | 'first_agent_created'
  | 'first_orchestration_created'
  | 'first_orchestration_executed'
  | 'first_kb_created'
  | 'plan_upgrade_started'
  | 'plan_upgrade_completed'
  | 'nps_submitted'

/**
 * Track a product analytics event.
 * Never throws — analytics must be non-blocking.
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
    // Silent — analytics must never break the main flow
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
