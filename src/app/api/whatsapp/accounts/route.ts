import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/whatsapp/accounts
 * Lista os números WABA conectados do usuário autenticado (sem expor o token).
 */
export async function GET(request: NextRequest) {
  const user = await getAuthFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const accounts = await prisma.whatsAppAccount.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      phoneNumberId: true,
      wabaId: true,
      displayPhoneNumber: true,
      verifiedName: true,
      status: true,
      agentId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: accounts })
}
