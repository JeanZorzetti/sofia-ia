import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOrgMembership } from '@/lib/org-auth'

// GET /api/organizations/[slug]/members — list all members
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

    const members = await prisma.organizationMember.findMany({
      where: { organization: { slug } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    })

    const data = members.map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[organizations/members] GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch members' }, { status: 500 })
  }
}
