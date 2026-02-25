import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/auth/sso/google
 * Inicia o fluxo OAuth 2.0 com Google Workspace
 * Query params:
 *   - domain: dominio da empresa (ex: empresa.com.br) — opcional, para lookup
 *   - org: slug da organização — opcional
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const domain = searchParams.get('domain')
  const orgSlug = searchParams.get('org')

  // Tenta encontrar configuração SSO para o domínio/org
  let clientId = process.env.GOOGLE_SSO_CLIENT_ID
  let redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://sofiaia.roilabs.com.br'}/api/auth/sso/google/callback`

  // Se um domínio ou org foi informado, busca configuração personalizada
  if (domain || orgSlug) {
    try {
      const org = await prisma.organization.findFirst({
        where: {
          OR: [
            ...(domain ? [{ ssoDomain: domain }] : []),
            ...(orgSlug ? [{ slug: orgSlug }] : []),
          ],
          ssoProvider: 'google',
        },
        select: { ssoClientId: true, slug: true },
      })
      if (org?.ssoClientId) {
        clientId = org.ssoClientId
      }
    } catch {
      // Usa client ID padrão se DB falhar
    }
  }

  if (!clientId) {
    return NextResponse.json(
      { error: 'Google SSO não está configurado para este domínio.' },
      { status: 400 }
    )
  }

  const state = Buffer.from(
    JSON.stringify({ domain, orgSlug, ts: Date.now() })
  ).toString('base64url')

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  googleAuthUrl.searchParams.set('client_id', clientId)
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri)
  googleAuthUrl.searchParams.set('response_type', 'code')
  googleAuthUrl.searchParams.set('scope', 'openid email profile')
  googleAuthUrl.searchParams.set('access_type', 'offline')
  googleAuthUrl.searchParams.set('prompt', 'select_account')
  googleAuthUrl.searchParams.set('state', state)

  return NextResponse.redirect(googleAuthUrl.toString())
}
