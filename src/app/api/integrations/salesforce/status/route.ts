import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { getOAuthConnection } from '@/lib/integrations/oauth'

// GET /api/integrations/salesforce/status — status da conexão Salesforce
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const configured = !!(process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET)

    if (!configured) {
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
          configured: false,
          message: 'Configure SALESFORCE_CLIENT_ID e SALESFORCE_CLIENT_SECRET no Vercel para ativar a integração.',
        },
      })
    }

    const connection = await getOAuthConnection(auth.id, 'salesforce')

    return NextResponse.json({
      success: true,
      data: {
        connected: !!connection,
        configured: true,
        metadata: connection
          ? {
              instanceUrl: (connection.metadata as any)?.instanceUrl,
              username: (connection.metadata as any)?.username,
              email: (connection.metadata as any)?.email,
              orgId: (connection.metadata as any)?.orgId,
              connectedAt: connection.createdAt,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Error fetching Salesforce status:', error)
    return NextResponse.json({ error: 'Erro ao verificar status' }, { status: 500 })
  }
}
