import { NextRequest, NextResponse } from 'next/server'
import { saveOAuthConnection } from '@/lib/integrations/oauth'

// GET /api/integrations/google-drive/callback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://polarisia.com.br'
  const dashboardUrl = `${appUrl}/dashboard/integrations/google-drive`

  if (error) {
    return NextResponse.redirect(`${dashboardUrl}?error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${dashboardUrl}?error=missing_params`)
  }

  let userId: string
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'))
    userId = stateData.userId
  } catch {
    return NextResponse.redirect(`${dashboardUrl}?error=invalid_state`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = `${appUrl}/api/integrations/google-drive/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${dashboardUrl}?error=not_configured`)
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
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
      console.error('[google-drive callback] Token exchange failed:', errData)
      return NextResponse.redirect(`${dashboardUrl}?error=token_exchange_failed`)
    }

    const tokens = await tokenResponse.json()

    let googleMetadata: Record<string, unknown> = {}
    try {
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      if (userResponse.ok) {
        const userData = await userResponse.json()
        googleMetadata = { email: userData.email, name: userData.name }
      }
    } catch {
      // metadata opcional
    }

    await saveOAuthConnection(
      userId,
      'google-drive',
      tokens.access_token,
      tokens.refresh_token || null,
      tokens.expires_in || 3600,
      googleMetadata
    )

    return NextResponse.redirect(`${dashboardUrl}?success=true`)
  } catch (err) {
    console.error('[google-drive callback] Error:', err)
    return NextResponse.redirect(`${dashboardUrl}?error=server_error`)
  }
}
