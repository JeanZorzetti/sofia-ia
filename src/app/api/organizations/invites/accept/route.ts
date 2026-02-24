import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit, getIpFromRequest, getUserAgentFromRequest } from '@/lib/audit'

// POST /api/organizations/invites/accept — accept an invite by token
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { token } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ success: false, error: 'token is required' }, { status: 400 })
    }

    // Find the invite
    const invite = await prisma.organizationInvite.findUnique({
      where: { token },
      include: { organization: true },
    })

    if (!invite) {
      return NextResponse.json({ success: false, error: 'Invite not found' }, { status: 404 })
    }

    if (invite.acceptedAt) {
      return NextResponse.json({ success: false, error: 'Invite already accepted' }, { status: 409 })
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: 'Invite has expired' }, { status: 410 })
    }

    // Check invite email matches (if user has an email registered)
    if (user.email && invite.email !== user.email) {
      return NextResponse.json(
        { success: false, error: 'This invite was sent to a different email address' },
        { status: 403 }
      )
    }

    // Check if already a member
    const existingMembership = await prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId: invite.orgId, userId: user.id } },
    })
    if (existingMembership) {
      return NextResponse.json({ success: false, error: 'Already a member of this organization' }, { status: 409 })
    }

    // Create membership + mark invite as accepted (transaction)
    await prisma.$transaction([
      prisma.organizationMember.create({
        data: {
          orgId: invite.orgId,
          userId: user.id,
          role: invite.role,
        },
      }),
      prisma.organizationInvite.update({
        where: { token },
        data: { acceptedAt: new Date() },
      }),
    ])

    await logAudit(
      user.id,
      'member.joined',
      'member',
      user.id,
      { orgId: invite.orgId, orgName: invite.organization.name, role: invite.role },
      invite.orgId,
      getIpFromRequest(request),
      getUserAgentFromRequest(request)
    )

    return NextResponse.json({
      success: true,
      data: {
        orgId: invite.orgId,
        orgName: invite.organization.name,
        orgSlug: invite.organization.slug,
        role: invite.role,
      },
      message: `Successfully joined ${invite.organization.name}`,
    })
  } catch (error) {
    console.error('[organizations/invites/accept] POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to accept invite' }, { status: 500 })
  }
}

// GET /api/organizations/invites/accept?token=xxx — get invite details (for preview page)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ success: false, error: 'token is required' }, { status: 400 })
    }

    const invite = await prisma.organizationInvite.findUnique({
      where: { token },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, plan: true },
        },
      },
    })

    if (!invite) {
      return NextResponse.json({ success: false, error: 'Invite not found' }, { status: 404 })
    }

    if (invite.acceptedAt) {
      return NextResponse.json({ success: false, error: 'Invite already accepted' }, { status: 409 })
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: 'Invite has expired' }, { status: 410 })
    }

    return NextResponse.json({
      success: true,
      data: {
        orgName: invite.organization.name,
        orgSlug: invite.organization.slug,
        role: invite.role,
        invitedBy: invite.invitedBy,
        email: invite.email,
        expiresAt: invite.expiresAt,
      },
    })
  } catch (error) {
    console.error('[organizations/invites/accept] GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch invite' }, { status: 500 })
  }
}
