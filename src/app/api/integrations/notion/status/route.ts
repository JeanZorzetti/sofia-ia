import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { getOAuthConnection } from '@/lib/integrations/oauth'

// GET /api/integrations/notion/status
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const connection = await getOAuthConnection(auth.id, 'notion')

  if (!connection) {
    return NextResponse.json({ connected: false })
  }

  const metadata = (connection.metadata as Record<string, string>) || {}

  return NextResponse.json({
    connected: true,
    metadata: {
      workspaceName: metadata.workspaceName || null,
      workspaceId: metadata.workspaceId || null,
    },
  })
}
