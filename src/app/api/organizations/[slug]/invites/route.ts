import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOrgMembership, isAdmin } from '@/lib/org-auth'
import { logAudit, getIpFromRequest, getUserAgentFromRequest } from '@/lib/audit'
import { sendEmail } from '@/lib/email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sofiaia.roilabs.com.br'

// GET /api/organizations/[slug]/invites — list pending invites
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
    if (!membership || !isAdmin(membership.role)) {
      return NextResponse.json({ success: false, error: 'Only admins can view invites' }, { status: 403 })
    }

    const invites = await prisma.organizationInvite.findMany({
      where: {
        organization: { slug },
        acceptedAt: null,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: invites })
  } catch (error) {
    console.error('[organizations/invites] GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch invites' }, { status: 500 })
  }
}

// POST /api/organizations/[slug]/invites — invite a member by email
export async function POST(
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
      return NextResponse.json({ success: false, error: 'Only admins can invite members' }, { status: 403 })
    }

    const body = await request.json()
    const { email, role = 'MEMBER' } = body

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Valid email is required' }, { status: 400 })
    }

    if (!['ADMIN', 'MEMBER', 'VIEWER'].includes(role)) {
      return NextResponse.json({ success: false, error: 'role must be ADMIN, MEMBER, or VIEWER' }, { status: 400 })
    }

    // Check if already a member
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      const alreadyMember = await prisma.organizationMember.findFirst({
        where: { userId: existingUser.id, organization: { slug } },
      })
      if (alreadyMember) {
        return NextResponse.json({ success: false, error: 'User is already a member' }, { status: 409 })
      }
    }

    // Check for existing pending invite
    const existingInvite = await prisma.organizationInvite.findFirst({
      where: {
        organization: { slug },
        email,
        acceptedAt: null,
        expiresAt: { gte: new Date() },
      },
    })
    if (existingInvite) {
      return NextResponse.json({ success: false, error: 'An active invite already exists for this email' }, { status: 409 })
    }

    // Create invite (expires in 7 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await prisma.organizationInvite.create({
      data: {
        orgId: membership.org.id,
        email,
        role,
        invitedBy: user.name || user.email,
        expiresAt,
      },
    })

    // Send invite email
    const acceptUrl = `${APP_URL}/dashboard/invites/accept?token=${invite.token}`
    await sendEmail({
      to: email,
      subject: `Convite para ${membership.org.name} no Sofia IA`,
      html: buildInviteEmail({
        orgName: membership.org.name,
        inviterName: user.name || user.email,
        role,
        acceptUrl,
        expiresAt,
      }),
    })

    await logAudit(
      user.id,
      'member.invited',
      'invite',
      invite.id,
      { email, role, orgSlug: slug },
      membership.org.id,
      getIpFromRequest(request),
      getUserAgentFromRequest(request)
    )

    return NextResponse.json({ success: true, data: invite }, { status: 201 })
  } catch (error) {
    console.error('[organizations/invites] POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create invite' }, { status: 500 })
  }
}

function buildInviteEmail({
  orgName,
  inviterName,
  role,
  acceptUrl,
  expiresAt,
}: {
  orgName: string
  inviterName: string
  role: string
  acceptUrl: string
  expiresAt: Date
}): string {
  const roleLabel = role === 'ADMIN' ? 'Administrador' : role === 'MEMBER' ? 'Membro' : 'Visualizador'
  const expires = expiresAt.toLocaleDateString('pt-BR')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="padding:32px 16px;max-width:600px;margin:0 auto;">
    <div style="background:#1e293b;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#6d28d9 0%,#3b82f6 100%);padding:40px 32px;text-align:center;">
        <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 8px;">Sofia IA</h1>
        <p style="color:rgba(255,255,255,0.8);font-size:16px;margin:0;">Convite para workspace colaborativo</p>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#f1f5f9;font-size:20px;margin:0 0 12px;">Você foi convidado!</h2>
        <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 16px;">
          <strong style="color:#e2e8f0;">${inviterName}</strong> convidou você para participar da organização
          <strong style="color:#e2e8f0;">${orgName}</strong> no Sofia IA como <strong style="color:#a78bfa;">${roleLabel}</strong>.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${acceptUrl}" style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#3b82f6);color:#fff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 32px;border-radius:8px;">
            Aceitar Convite
          </a>
        </div>
        <p style="color:#64748b;font-size:13px;margin:0;text-align:center;">Este convite expira em ${expires}.</p>
      </div>
      <div style="padding:24px 32px;text-align:center;border-top:1px solid #334155;">
        <p style="color:#475569;font-size:13px;margin:0;">Sofia IA - ROI Labs</p>
      </div>
    </div>
  </div>
</body>
</html>`
}
