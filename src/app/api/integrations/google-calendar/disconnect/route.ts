import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await prisma.oAuthConnection.deleteMany({ where: { userId: auth.id, provider: 'google-calendar' } })
  return NextResponse.json({ success: true })
}
