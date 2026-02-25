import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'

// GET /api/integrations/salesforce/connect — inicia OAuth flow Salesforce
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const clientId = process.env.SALESFORCE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      {
        error: 'Salesforce não configurado. Configure SALESFORCE_CLIENT_ID e SALESFORCE_CLIENT_SECRET no Vercel.',
      },
      { status: 503 }
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sofiaia.roilabs.com.br'
  const redirectUri = `${appUrl}/api/integrations/salesforce/callback`

  const state = Buffer.from(JSON.stringify({ userId: auth.id })).toString('base64url')

  const authUrl = new URL('https://login.salesforce.com/services/oauth2/authorize')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('scope', 'api refresh_token offline_access')

  return NextResponse.redirect(authUrl.toString())
}
