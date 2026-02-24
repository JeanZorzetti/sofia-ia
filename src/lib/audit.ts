/**
 * Audit log helper for Sofia IA.
 * Records user actions in UserAuditLog (fire and forget — never blocks).
 *
 * Usage:
 *   await logAudit(user.id, 'agent.created', 'agent', agent.id, { name: agent.name })
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

/**
 * Log an audit event. Uses fire-and-forget pattern (catches all errors).
 *
 * @param userId     - The authenticated user's ID
 * @param action     - Action string, e.g. "agent.created", "orchestration.executed"
 * @param resource   - Resource type, e.g. "agent", "orchestration", "member"
 * @param resourceId - Optional ID of the affected resource
 * @param metadata   - Optional additional data to store
 * @param orgId      - Optional organization ID
 * @param ip         - Optional IP address
 * @param userAgent  - Optional user agent string
 */
export async function logAudit(
  userId: string,
  action: string,
  resource: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
  orgId?: string,
  ip?: string,
  userAgent?: string
): Promise<void> {
  prisma.userAuditLog
    .create({
      data: {
        userId,
        orgId: orgId || null,
        action,
        resource,
        resourceId: resourceId || null,
        metadata: (metadata || {}) as Prisma.InputJsonValue,
        ip: ip || null,
        userAgent: userAgent || null,
      },
    })
    .catch((err) => {
      // Fire and forget — never block the main request
      console.error('[audit] Failed to write audit log:', err)
    })
}

/**
 * Extract IP address from a request.
 */
export function getIpFromRequest(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return undefined
}

/**
 * Extract user agent from a request.
 */
export function getUserAgentFromRequest(request: Request): string | undefined {
  return request.headers.get('user-agent') || undefined
}
