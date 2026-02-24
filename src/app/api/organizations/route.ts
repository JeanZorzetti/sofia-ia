import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit, getIpFromRequest, getUserAgentFromRequest } from '@/lib/audit'

// GET /api/organizations — list all orgs the user belongs to
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: {
        organization: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    })

    const data = memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      plan: m.organization.plan,
      role: m.role,
      joinedAt: m.joinedAt,
      memberCount: m.organization._count.members,
      createdAt: m.organization.createdAt,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[organizations] GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch organizations' }, { status: 500 })
  }
}

// POST /api/organizations — create a new org
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, slug } = body

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'name must be at least 2 characters' }, { status: 400 })
    }

    if (!slug || typeof slug !== 'string' || !/^[a-z0-9-]{2,50}$/.test(slug)) {
      return NextResponse.json(
        { success: false, error: 'slug must be 2-50 lowercase alphanumeric characters or hyphens' },
        { status: 400 }
      )
    }

    // Check slug uniqueness
    const existing = await prisma.organization.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Slug already taken' }, { status: 409 })
    }

    // Create org + add creator as ADMIN
    const org = await prisma.organization.create({
      data: {
        name: name.trim(),
        slug,
        plan: 'free',
        members: {
          create: {
            userId: user.id,
            role: 'ADMIN',
          },
        },
      },
      include: {
        _count: { select: { members: true } },
      },
    })

    await logAudit(
      user.id,
      'organization.created',
      'organization',
      org.id,
      { name: org.name, slug: org.slug },
      org.id,
      getIpFromRequest(request),
      getUserAgentFromRequest(request)
    )

    return NextResponse.json({ success: true, data: org }, { status: 201 })
  } catch (error) {
    console.error('[organizations] POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create organization' }, { status: 500 })
  }
}
