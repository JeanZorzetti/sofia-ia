import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOrgMembership, isAdmin } from '@/lib/org-auth'
import { logAudit, getIpFromRequest, getUserAgentFromRequest } from '@/lib/audit'

// GET /api/organizations/[slug] — get org details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getAuthFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { slug } = await params
    const membership = await getOrgMembership(user.id, slug)
    if (!membership) {
      return NextResponse.json({ success: false, error: 'Not a member of this organization' }, { status: 403 })
    }

    const org = await prisma.organization.findUnique({
      where: { slug },
      include: {
        _count: { select: { members: true, invites: true } },
      },
    })

    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { ...org, role: membership.role },
    })
  } catch (error) {
    console.error('[organizations/[slug]] GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch organization' }, { status: 500 })
  }
}

// PATCH /api/organizations/[slug] — update org name
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getAuthFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { slug } = await params
    const membership = await getOrgMembership(user.id, slug)
    if (!membership || !isAdmin(membership.role)) {
      return NextResponse.json({ success: false, error: 'Only admins can update the organization' }, { status: 403 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'name must be at least 2 characters' }, { status: 400 })
    }

    const org = await prisma.organization.update({
      where: { slug },
      data: { name: name.trim() },
    })

    await logAudit(
      user.id,
      'organization.updated',
      'organization',
      org.id,
      { name: org.name },
      org.id,
      getIpFromRequest(request),
      getUserAgentFromRequest(request)
    )

    return NextResponse.json({ success: true, data: org })
  } catch (error) {
    console.error('[organizations/[slug]] PATCH error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update organization' }, { status: 500 })
  }
}

// DELETE /api/organizations/[slug] — delete org (ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getAuthFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { slug } = await params
    const membership = await getOrgMembership(user.id, slug)
    if (!membership || !isAdmin(membership.role)) {
      return NextResponse.json({ success: false, error: 'Only admins can delete the organization' }, { status: 403 })
    }

    await logAudit(
      user.id,
      'organization.deleted',
      'organization',
      membership.org.id,
      { name: membership.org.name, slug },
      membership.org.id,
      getIpFromRequest(request),
      getUserAgentFromRequest(request)
    )

    await prisma.organization.delete({ where: { slug } })

    return NextResponse.json({ success: true, message: 'Organization deleted' })
  } catch (error) {
    console.error('[organizations/[slug]] DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete organization' }, { status: 500 })
  }
}
