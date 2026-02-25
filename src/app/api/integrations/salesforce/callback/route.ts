import { NextRequest, NextResponse } from 'next/server'
import { saveOAuthConnection } from '@/lib/integrations/oauth'

// GET /api/integrations/salesforce/callback — recebe code do OAuth Salesforce
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sofiaia.roilabs.com.br'

  if (error) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/salesforce?error=${encodeURIComponent(error)}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/salesforce?error=missing_params`
    )
  }

  let userId: string
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'))
    userId = stateData.userId
  } catch {
    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/salesforce?error=invalid_state`
    )
  }

  const clientId = process.env.SALESFORCE_CLIENT_ID
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET
  const redirectUri = `${appUrl}/api/integrations/salesforce/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/salesforce?error=not_configured`
    )
  }

  try {
    const tokenResponse = await fetch('https://login.salesforce.com/services/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    })

    if (!tokenResponse.ok) {
      const errData = await tokenResponse.text()
      console.error('[salesforce callback] Token exchange failed:', errData)
      return NextResponse.redirect(
        `${appUrl}/dashboard/integrations/salesforce?error=token_exchange_failed`
      )
    }

    const tokens = await tokenResponse.json()

    // Metadados da instância Salesforce
    const metadata: Record<string, unknown> = {
      instanceUrl: tokens.instance_url,
      id: tokens.id,
      issuedAt: tokens.issued_at,
    }

    // Buscar informações do usuário Salesforce
    if (tokens.id && tokens.access_token) {
      try {
        const userResponse = await fetch(tokens.id, {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        })
        if (userResponse.ok) {
          const userData = await userResponse.json()
          metadata.username = userData.username
          metadata.email = userData.email
          metadata.displayName = userData.display_name
          metadata.orgId = userData.organization_id
        }
      } catch {
        // Metadata opcional
      }
    }

    await saveOAuthConnection(
      userId,
      'salesforce',
      tokens.access_token,
      tokens.refresh_token || null,
      7200, // Salesforce tokens duram ~2h
      metadata
    )

    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/salesforce?success=true`
    )
  } catch (error) {
    console.error('[salesforce callback] Error:', error)
    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/salesforce?error=server_error`
    )
  }
}
