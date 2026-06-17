import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/whatsapp/accounts/[id]
 * Vincula/desvincula o agente que responde por este número (body { agentId }).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.whatsAppAccount.findFirst({ where: { id, userId: user.id } })
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }

  let body: { agentId?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 })
  }

  const account = await prisma.whatsAppAccount.update({
    where: { id },
    data: { agentId: body.agentId ?? null },
    select: { id: true, phoneNumberId: true, agentId: true },
  })

  return NextResponse.json({ success: true, account })
}

/**
 * DELETE /api/whatsapp/accounts/[id]
 * Desconecta o número (remove a conta). Não revoga o token na Meta.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.whatsAppAccount.findFirst({ where: { id, userId: user.id } })
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }

  await prisma.whatsAppAccount.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
