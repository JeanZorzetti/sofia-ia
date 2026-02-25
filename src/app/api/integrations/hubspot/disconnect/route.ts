import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/integrations/hubspot/disconnect — remove conexão HubSpot
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    await prisma.oAuthConnection.deleteMany({
      where: { userId: auth.id, provider: 'hubspot' },
    })

    return NextResponse.json({ success: true, message: 'HubSpot desconectado com sucesso' })
  } catch (error) {
    console.error('Error disconnecting HubSpot:', error)
    return NextResponse.json({ error: 'Erro ao desconectar HubSpot' }, { status: 500 })
  }
}
