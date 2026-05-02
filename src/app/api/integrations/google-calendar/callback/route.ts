import { NextRequest, NextResponse } from 'next/server'
import { saveOAuthConnection } from '@/lib/integrations/oauth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://polarisia.com.br'
  const dashboardUrl = `${appUrl}/dashboard/integrations/google-calendar`

  if (error) return NextResponse.redirect(`${dashboardUrl}?error=${encodeURIComponent(error)}`)
  if (!code || !state) return NextResponse.redirect(`${dashboardUrl}?error=missing_params`)

  let userId: string
  try {
    userId = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8')).userId
  } catch {
    return NextResponse.redirect(`${dashboardUrl}?error=invalid_state`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = `${appUrl}/api/integrations/google-calendar/callback`

  if (!clientId || !clientSecret) return NextResponse.redirect(`${dashboardUrl}?error=not_configured`)

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
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

    if (!tokenRes.ok) return NextResponse.redirect(`${dashboardUrl}?error=token_exchange_failed`)
    const tokens = await tokenRes.json()

    let metadata: Record<string, unknown> = {}
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      if (userRes.ok) {
        const u = await userRes.json()
        metadata = { email: u.email, name: u.name }
      }
    } catch { /* opcional */ }

    await saveOAuthConnection(userId, 'google-calendar', tokens.access_token, tokens.refresh_token || null, tokens.expires_in || 3600, metadata)
    return NextResponse.redirect(`${dashboardUrl}?success=true`)
  } catch {
    return NextResponse.redirect(`${dashboardUrl}?error=server_error`)
  }
}
