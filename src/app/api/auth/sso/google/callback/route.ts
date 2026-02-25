import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken, setAuthCookie } from '@/lib/auth'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sofiaia.roilabs.com.br'
const REDIRECT_URI = `${APP_URL}/api/auth/sso/google/callback`

/**
 * GET /api/auth/sso/google/callback
 * Recebe o code do Google, troca por token, faz login ou cria usuário
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

  // Decodifica state
  let stateData: { domain?: string; orgSlug?: string } = {}
  try {
    if (stateRaw) {
      stateData = JSON.parse(Buffer.from(stateRaw, 'base64url').toString())
    }
  } catch {
    // state inválido, continua sem ele
  }

  try {
    // Busca configuração SSO da organização
    let clientId = process.env.GOOGLE_SSO_CLIENT_ID || ''
    let clientSecret = process.env.GOOGLE_SSO_CLIENT_SECRET || ''

    if (stateData.domain || stateData.orgSlug) {
      const org = await prisma.organization.findFirst({
        where: {
          OR: [
            ...(stateData.domain ? [{ ssoDomain: stateData.domain }] : []),
            ...(stateData.orgSlug ? [{ slug: stateData.orgSlug }] : []),
          ],
          ssoProvider: 'google',
        },
        select: { ssoClientId: true, ssoClientSecret: true, slug: true },
      }).catch(() => null)

      if (org?.ssoClientId) clientId = org.ssoClientId
      if (org?.ssoClientSecret) clientSecret = org.ssoClientSecret
    }

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${APP_URL}/login?error=sso_not_configured`)
    }

    // Troca code por access_token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      console.error('Google token exchange failed:', await tokenResponse.text())
      return NextResponse.redirect(`${APP_URL}/login?error=sso_token_failed`)
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Busca perfil do usuário
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!profileResponse.ok) {
      return NextResponse.redirect(`${APP_URL}/login?error=sso_profile_failed`)
    }

    const profile = await profileResponse.json()
    const email: string = profile.email
    const name: string = profile.name || email.split('@')[0]
    const emailDomain = email.split('@')[1]

    // Verifica se o domínio tem SSO configurado
    const ssoOrg = await prisma.organization.findFirst({
      where: { ssoDomain: emailDomain, ssoProvider: 'google' },
    }).catch(() => null)

    // Cria ou encontra o usuário no banco
    let user = await prisma.user.findUnique({ where: { email } }).catch(() => null)

    if (!user) {
      // Cria novo usuário via SSO
      user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash: '', // SSO users não têm senha
          role: 'agent',
          status: 'active',
          googleId: profile.id,
        },
      })
    } else if (!user.googleId) {
      // Atualiza googleId se não estava definido
      await prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.id, lastLogin: new Date() },
      }).catch(() => null)
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      }).catch(() => null)
    }

    // Se há organização SSO, vincula o membro automaticamente
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

    return NextResponse.redirect(`${APP_URL}/dashboard?sso=google`)
  } catch (err) {
    console.error('Google SSO callback error:', err)
    return NextResponse.redirect(`${APP_URL}/login?error=sso_internal`)
  }
}
