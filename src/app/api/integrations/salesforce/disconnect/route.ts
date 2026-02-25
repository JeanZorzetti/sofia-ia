import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/integrations/salesforce/disconnect — remove conexão Salesforce
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    await prisma.oAuthConnection.deleteMany({
      where: { userId: auth.id, provider: 'salesforce' },
    })

    return NextResponse.json({ success: true, message: 'Salesforce desconectado com sucesso' })
  } catch (error) {
    console.error('Error disconnecting Salesforce:', error)
    return NextResponse.json({ error: 'Erro ao desconectar Salesforce' }, { status: 500 })
  }
}
