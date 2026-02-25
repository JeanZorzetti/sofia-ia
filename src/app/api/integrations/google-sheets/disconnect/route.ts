import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/integrations/google-sheets/disconnect
export async function DELETE(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    await prisma.oAuthConnection.deleteMany({
      where: { userId: auth.id, provider: 'google-sheets' },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[google-sheets disconnect]', error)
    return NextResponse.json({ error: 'Erro ao desconectar' }, { status: 500 })
  }
}
