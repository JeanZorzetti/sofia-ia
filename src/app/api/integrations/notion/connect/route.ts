import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'

// GET /api/integrations/notion/connect — inicia OAuth flow Notion
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const clientId = process.env.NOTION_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      {
        error:
          'Notion não configurado. Configure NOTION_CLIENT_ID e NOTION_CLIENT_SECRET no Vercel.',
      },
      { status: 503 }
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sofiaia.roilabs.com.br'
  const redirectUri = `${appUrl}/api/integrations/notion/callback`

  // Incluir userId no state para recuperar após callback
  const state = Buffer.from(JSON.stringify({ userId: auth.id })).toString('base64url')

  const authUrl = new URL('https://api.notion.com/v1/oauth/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('owner', 'user')
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}
