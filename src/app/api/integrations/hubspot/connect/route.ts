import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'

// GET /api/integrations/hubspot/connect — inicia OAuth flow HubSpot
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const clientId = process.env.HUBSPOT_CLIENT_ID
  if (!clientId) {
    // Graceful fallback: env vars não configuradas
    return NextResponse.json(
      {
        error: 'HubSpot não configurado. Configure HUBSPOT_CLIENT_ID e HUBSPOT_CLIENT_SECRET no Vercel.',
      },
      { status: 503 }
    )
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://sofiaia.roilabs.com.br'}/api/integrations/hubspot/callback`

  const scopes = [
    'crm.objects.contacts.read',
    'crm.objects.contacts.write',
    'crm.objects.deals.read',
    'crm.objects.deals.write',
    'oauth',
  ].join(' ')

  // Incluir userId no state para recuperar após callback
  const state = Buffer.from(JSON.stringify({ userId: auth.id })).toString('base64url')

  const authUrl = new URL('https://app.hubspot.com/oauth/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}
