import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'

// GET /api/integrations/google-sheets/connect — inicia OAuth flow Google Sheets
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const clientId = process.env.GOOGLE_SHEETS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      {
        error:
          'Google Sheets não configurado. Configure GOOGLE_SHEETS_CLIENT_ID e GOOGLE_SHEETS_CLIENT_SECRET no Vercel.',
      },
      { status: 503 }
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sofiaia.roilabs.com.br'
  const redirectUri = `${appUrl}/api/integrations/google-sheets/callback`

  const scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
  ].join(' ')

  // Incluir userId no state para recuperar após callback
  const state = Buffer.from(JSON.stringify({ userId: auth.id })).toString('base64url')

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}
