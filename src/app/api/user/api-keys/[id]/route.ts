import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const key = await prisma.apiKey.findFirst({ where: { id, userId: auth.id } })
  if (!key) return NextResponse.json({ success: false, error: 'Chave não encontrada' }, { status: 404 })

  await prisma.apiKey.update({ where: { id }, data: { status: 'revoked' } })

  return NextResponse.json({ success: true })
}
