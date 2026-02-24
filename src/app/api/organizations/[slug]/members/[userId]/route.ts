import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOrgMembership, isAdmin } from '@/lib/org-auth'
import { logAudit, getIpFromRequest, getUserAgentFromRequest } from '@/lib/audit'

// PATCH /api/organizations/[slug]/members/[userId] — change role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  try {
    const user = await getAuthFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { slug, userId: targetUserId } = await params
    const membership = await getOrgMembership(user.id, slug)
    if (!membership || !isAdmin(membership.role)) {
      return NextResponse.json({ success: false, error: 'Only admins can change roles' }, { status: 403 })
    }

    // Cannot change own role
    if (targetUserId === user.id) {
      return NextResponse.json({ success: false, error: 'Cannot change your own role' }, { status: 400 })
    }

    const body = await request.json()
    const { role } = body
    if (!role || !['ADMIN', 'MEMBER', 'VIEWER'].includes(role)) {
      return NextResponse.json({ success: false, error: 'role must be ADMIN, MEMBER, or VIEWER' }, { status: 400 })
    }

    const updated = await prisma.organizationMember.updateMany({
      where: {
        userId: targetUserId,
        organization: { slug },
      },
      data: { role },
    })

    if (updated.count === 0) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 })
    }

    await logAudit(
      user.id,
      'member.roleChanged',
      'member',
      targetUserId,
      { newRole: role, orgSlug: slug },
      membership.org.id,
      getIpFromRequest(request),
      getUserAgentFromRequest(request)
    )

    return NextResponse.json({ success: true, message: 'Role updated' })
  } catch (error) {
    console.error('[organizations/members/[userId]] PATCH error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update role' }, { status: 500 })
  }
}

// DELETE /api/organizations/[slug]/members/[userId] — remove member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  try {
    const user = await getAuthFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { slug, userId: targetUserId } = await params
    const membership = await getOrgMembership(user.id, slug)
    if (!membership || !isAdmin(membership.role)) {
      return NextResponse.json({ success: false, error: 'Only admins can remove members' }, { status: 403 })
    }

    // Cannot remove self
    if (targetUserId === user.id) {
      return NextResponse.json({ success: false, error: 'Cannot remove yourself from the organization' }, { status: 400 })
    }

    const deleted = await prisma.organizationMember.deleteMany({
      where: {
        userId: targetUserId,
        organization: { slug },
      },
    })

    if (deleted.count === 0) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 })
    }

    await logAudit(
      user.id,
      'member.removed',
      'member',
      targetUserId,
      { orgSlug: slug },
      membership.org.id,
      getIpFromRequest(request),
      getUserAgentFromRequest(request)
    )

    return NextResponse.json({ success: true, message: 'Member removed' })
  } catch (error) {
    console.error('[organizations/members/[userId]] DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Failed to remove member' }, { status: 500 })
  }
}
