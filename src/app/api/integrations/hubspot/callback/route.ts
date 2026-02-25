import { NextRequest, NextResponse } from 'next/server'
import { saveOAuthConnection } from '@/lib/integrations/oauth'

// GET /api/integrations/hubspot/callback — recebe code do OAuth HubSpot
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sofiaia.roilabs.com.br'

  if (error) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/hubspot?error=${encodeURIComponent(error)}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/hubspot?error=missing_params`
    )
  }

  // Decodificar state para recuperar userId
  let userId: string
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'))
    userId = stateData.userId
  } catch {
    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/hubspot?error=invalid_state`
    )
  }

  const clientId = process.env.HUBSPOT_CLIENT_ID
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET
  const redirectUri = `${appUrl}/api/integrations/hubspot/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/hubspot?error=not_configured`
    )
  }

  try {
    // Trocar code por tokens
    const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
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
      console.error('[hubspot callback] Token exchange failed:', errData)
      return NextResponse.redirect(
        `${appUrl}/dashboard/integrations/hubspot?error=token_exchange_failed`
      )
    }

    const tokens = await tokenResponse.json()

    // Buscar informações da conta HubSpot
    let hubspotMetadata: Record<string, unknown> = {}
    try {
      const meResponse = await fetch(
        `https://api.hubapi.com/oauth/v1/access-tokens/${tokens.access_token}`
      )
      if (meResponse.ok) {
        const meData = await meResponse.json()
        hubspotMetadata = {
          hubId: meData.hub_id,
          hubDomain: meData.hub_domain,
          email: meData.user,
          tokenType: meData.token_type,
        }
      }
    } catch {
      // Metadata opcional
    }

    await saveOAuthConnection(
      userId,
      'hubspot',
      tokens.access_token,
      tokens.refresh_token || null,
      tokens.expires_in || 1800,
      hubspotMetadata
    )

    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/hubspot?success=true`
    )
  } catch (error) {
    console.error('[hubspot callback] Error:', error)
    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/hubspot?error=server_error`
    )
  }
}
