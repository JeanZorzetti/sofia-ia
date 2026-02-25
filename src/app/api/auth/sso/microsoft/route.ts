import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sofiaia.roilabs.com.br'

/**
 * GET /api/auth/sso/microsoft
 * Inicia o fluxo OAuth 2.0 com Microsoft Entra ID (Azure AD)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const domain = searchParams.get('domain')
  const orgSlug = searchParams.get('org')

  let clientId = process.env.MICROSOFT_SSO_CLIENT_ID
  const redirectUri = `${APP_URL}/api/auth/sso/microsoft/callback`
  // Default tenant — pode ser 'common' para multi-tenant ou o tenant ID específico
  let tenantId = process.env.MICROSOFT_SSO_TENANT_ID || 'common'

  if (domain || orgSlug) {
    try {
      const org = await prisma.organization.findFirst({
        where: {
          OR: [
            ...(domain ? [{ ssoDomain: domain }] : []),
            ...(orgSlug ? [{ slug: orgSlug }] : []),
          ],
          ssoProvider: 'microsoft',
        },
        select: { ssoClientId: true, slug: true },
      })
      if (org?.ssoClientId) {
        clientId = org.ssoClientId
      }
    } catch {
      // Usa configuração padrão
    }
  }

  if (!clientId) {
    return NextResponse.json(
      { error: 'Microsoft SSO não está configurado para este domínio.' },
      { status: 400 }
    )
  }

  const state = Buffer.from(
    JSON.stringify({ domain, orgSlug, ts: Date.now() })
  ).toString('base64url')

  const microsoftAuthUrl = new URL(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`
  )
  microsoftAuthUrl.searchParams.set('client_id', clientId)
  microsoftAuthUrl.searchParams.set('redirect_uri', redirectUri)
  microsoftAuthUrl.searchParams.set('response_type', 'code')
  microsoftAuthUrl.searchParams.set('scope', 'openid email profile User.Read')
  microsoftAuthUrl.searchParams.set('response_mode', 'query')
  microsoftAuthUrl.searchParams.set('state', state)

  return NextResponse.redirect(microsoftAuthUrl.toString())
}
