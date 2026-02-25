import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken, setAuthCookie } from '@/lib/auth'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sofiaia.roilabs.com.br'
const REDIRECT_URI = `${APP_URL}/api/auth/sso/microsoft/callback`

/**
 * GET /api/auth/sso/microsoft/callback
 * Recebe code do Microsoft Entra, troca por token, faz login ou cria usuário
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const stateRaw = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${APP_URL}/login?error=sso_cancelled`)
  }

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/login?error=sso_no_code`)
  }

  let stateData: { domain?: string; orgSlug?: string } = {}
  try {
    if (stateRaw) {
      stateData = JSON.parse(Buffer.from(stateRaw, 'base64url').toString())
    }
  } catch {
    // state inválido, continua
  }

  try {
    let clientId = process.env.MICROSOFT_SSO_CLIENT_ID || ''
    let clientSecret = process.env.MICROSOFT_SSO_CLIENT_SECRET || ''
    let tenantId = process.env.MICROSOFT_SSO_TENANT_ID || 'common'

    if (stateData.domain || stateData.orgSlug) {
      const org = await prisma.organization.findFirst({
        where: {
          OR: [
            ...(stateData.domain ? [{ ssoDomain: stateData.domain }] : []),
            ...(stateData.orgSlug ? [{ slug: stateData.orgSlug }] : []),
          ],
          ssoProvider: 'microsoft',
        },
        select: { ssoClientId: true, ssoClientSecret: true },
      }).catch(() => null)

      if (org?.ssoClientId) clientId = org.ssoClientId
      if (org?.ssoClientSecret) clientSecret = org.ssoClientSecret
    }

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${APP_URL}/login?error=sso_not_configured`)
    }

    // Troca code por access_token
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
          scope: 'openid email profile User.Read',
        }),
      }
    )

    if (!tokenResponse.ok) {
      console.error('Microsoft token exchange failed:', await tokenResponse.text())
      return NextResponse.redirect(`${APP_URL}/login?error=sso_token_failed`)
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Busca perfil do usuário via Microsoft Graph
    const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!profileResponse.ok) {
      return NextResponse.redirect(`${APP_URL}/login?error=sso_profile_failed`)
    }

    const profile = await profileResponse.json()
    const email: string = profile.mail || profile.userPrincipalName
    const name: string = profile.displayName || email.split('@')[0]
    const emailDomain = email.split('@')[1]

    if (!email) {
      return NextResponse.redirect(`${APP_URL}/login?error=sso_no_email`)
    }

    // Verifica se o domínio tem SSO configurado
    const ssoOrg = await prisma.organization.findFirst({
      where: { ssoDomain: emailDomain, ssoProvider: 'microsoft' },
    }).catch(() => null)

    // Cria ou encontra o usuário
    let user = await prisma.user.findUnique({ where: { email } }).catch(() => null)

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash: '', // SSO users não têm senha local
          role: 'agent',
          status: 'active',
        },
      })
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      }).catch(() => null)
    }

    // Vincula membro à organização SSO automaticamente
    if (ssoOrg) {
      const existingMember = await prisma.organizationMember.findFirst({
        where: { orgId: ssoOrg.id, userId: user.id },
      }).catch(() => null)

      if (!existingMember) {
        await prisma.organizationMember.create({
          data: { orgId: ssoOrg.id, userId: user.id, role: 'MEMBER' },
        }).catch(() => null)
      }
    }

    // Emite JWT
    const token = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    await setAuthCookie(token)

    return NextResponse.redirect(`${APP_URL}/dashboard?sso=microsoft`)
  } catch (err) {
    console.error('Microsoft SSO callback error:', err)
    return NextResponse.redirect(`${APP_URL}/login?error=sso_internal`)
  }
}
