import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { getOAuthConnection } from '@/lib/integrations/oauth'

// GET /api/integrations/hubspot/status — status da conexão HubSpot
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const configured = !!(process.env.HUBSPOT_CLIENT_ID && process.env.HUBSPOT_CLIENT_SECRET)

    if (!configured) {
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
          configured: false,
          message: 'Configure HUBSPOT_CLIENT_ID e HUBSPOT_CLIENT_SECRET no Vercel para ativar a integração.',
        },
      })
    }

    const connection = await getOAuthConnection(auth.id, 'hubspot')

    return NextResponse.json({
      success: true,
      data: {
        connected: !!connection,
        configured: true,
        metadata: connection
          ? {
              hubId: (connection.metadata as any)?.hubId,
              hubDomain: (connection.metadata as any)?.hubDomain,
              email: (connection.metadata as any)?.email,
              connectedAt: connection.createdAt,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Error fetching HubSpot status:', error)
    return NextResponse.json({ error: 'Erro ao verificar status' }, { status: 500 })
  }
}
