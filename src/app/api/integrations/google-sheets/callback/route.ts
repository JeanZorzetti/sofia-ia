import { NextRequest, NextResponse } from 'next/server'
import { saveOAuthConnection } from '@/lib/integrations/oauth'

// GET /api/integrations/google-sheets/callback — recebe code do OAuth Google
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sofiaia.roilabs.com.br'

  if (error) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/google-sheets?error=${encodeURIComponent(error)}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/google-sheets?error=missing_params`
    )
  }

  // Decodificar state para recuperar userId
  let userId: string
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'))
    userId = stateData.userId
  } catch {
    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/google-sheets?error=invalid_state`
    )
  }

  const clientId = process.env.GOOGLE_SHEETS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_SHEETS_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = `${appUrl}/api/integrations/google-sheets/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/google-sheets?error=not_configured`
    )
  }

  try {
    // Trocar code por tokens
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
      console.error('[google-sheets callback] Token exchange failed:', errData)
      return NextResponse.redirect(
        `${appUrl}/dashboard/integrations/google-sheets?error=token_exchange_failed`
      )
    }

    const tokens = await tokenResponse.json()

    // Buscar informações do usuário Google
    let googleMetadata: Record<string, unknown> = {}
    try {
      const userResponse = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        }
      )
      if (userResponse.ok) {
        const userData = await userResponse.json()
        googleMetadata = {
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
        }
      }
    } catch {
      // Metadata opcional
    }

    await saveOAuthConnection(
      userId,
      'google-sheets',
      tokens.access_token,
      tokens.refresh_token || null,
      tokens.expires_in || 3600,
      googleMetadata
    )

    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/google-sheets?success=true`
    )
  } catch (error) {
    console.error('[google-sheets callback] Error:', error)
    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/google-sheets?error=server_error`
    )
  }
}
