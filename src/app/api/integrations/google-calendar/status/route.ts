import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { getOAuthConnection } from '@/lib/integrations/oauth'

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const conn = await getOAuthConnection(auth.id, 'google-calendar')
  if (!conn) return NextResponse.json({ connected: false })

  return NextResponse.json({ connected: true, metadata: conn.metadata || {}, expiresAt: conn.expiresAt })
}
