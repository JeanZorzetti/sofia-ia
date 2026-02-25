import { NextRequest, NextResponse } from 'next/server'
import { saveOAuthConnection } from '@/lib/integrations/oauth'

// GET /api/integrations/notion/callback — recebe code do OAuth Notion
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sofiaia.roilabs.com.br'

  if (error) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/notion?error=${encodeURIComponent(error)}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/notion?error=missing_params`
    )
  }

  // Decodificar state para recuperar userId
  let userId: string
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'))
    userId = stateData.userId
  } catch {
    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/notion?error=invalid_state`
    )
  }

  const clientId = process.env.NOTION_CLIENT_ID
  const clientSecret = process.env.NOTION_CLIENT_SECRET
  const redirectUri = `${appUrl}/api/integrations/notion/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/notion?error=not_configured`
    )
  }

  try {
    // Trocar code por token (Notion usa Basic Auth para troca)
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errData = await tokenResponse.text()
      console.error('[notion callback] Token exchange failed:', errData)
      return NextResponse.redirect(
        `${appUrl}/dashboard/integrations/notion?error=token_exchange_failed`
      )
    }

    const tokens = await tokenResponse.json()

    const notionMetadata: Record<string, unknown> = {
      workspaceId: tokens.workspace_id,
      workspaceName: tokens.workspace_name,
      workspaceIcon: tokens.workspace_icon,
      botId: tokens.bot_id,
      ownerType: tokens.owner?.type,
    }

    // Notion tokens não expiram — passar null para expiresIn
    await saveOAuthConnection(
      userId,
      'notion',
      tokens.access_token,
      null,
      null,
      notionMetadata
    )

    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/notion?success=true`
    )
  } catch (error) {
    console.error('[notion callback] Error:', error)
    return NextResponse.redirect(
      `${appUrl}/dashboard/integrations/notion?error=server_error`
    )
  }
}
