/**
 * Organization auth helpers for Sofia IA.
 * Used to check membership and permissions within organizations.
 */

import { prisma } from '@/lib/prisma'

export interface OrgMembership {
  org: {
    id: string
    name: string
    slug: string
    plan: string
    createdAt: Date
    updatedAt: Date
  }
  role: string
}

/**
 * Get the organization membership for a user by org slug.
 * Returns { org, role } if the user is a member, or null if not.
 */
export async function getOrgMembership(
  userId: string,
  orgSlug: string
): Promise<OrgMembership | null> {
  try {
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId,
        organization: { slug: orgSlug },
      },
      include: {
        organization: true,
      },
    })

    if (!membership) return null

    return {
      org: membership.organization,
      role: membership.role,
    }
  } catch {
    return null
  }
}

/**
 * Get organization membership by orgId (not slug).
 */
export async function getOrgMembershipById(
  userId: string,
  orgId: string
): Promise<OrgMembership | null> {
  try {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        orgId_userId: { orgId, userId },
      },
      include: {
        organization: true,
      },
    })

    if (!membership) return null

    return {
      org: membership.organization,
      role: membership.role,
    }
  } catch {
    return null
  }
}

/**
 * Check if role allows write operations (ADMIN or MEMBER).
 */
export function canWrite(role: string): boolean {
  return role === 'ADMIN' || role === 'MEMBER'
}

/**
 * Check if role is ADMIN.
 */
export function isAdmin(role: string): boolean {
  return role === 'ADMIN'
}

/**
 * Get all organizations a user belongs to.
 */
export async function getUserOrganizations(userId: string) {
  try {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: true,
      },
      orderBy: { joinedAt: 'asc' },
    })

    return memberships.map((m) => ({
      org: m.organization,
      role: m.role,
      joinedAt: m.joinedAt,
    }))
  } catch {
    return []
  }
}
