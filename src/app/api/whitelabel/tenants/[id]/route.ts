import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { status } = body

  if (!['active', 'suspended', 'canceled'].includes(status)) {
    return NextResponse.json({ success: false, error: 'Status inválido' }, { status: 400 })
  }

  const account = await prisma.whitelabelAccount.findUnique({
    where: { userId: auth.userId },
  })
  if (!account) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const tenant = await prisma.whitelabelTenant.updateMany({
    where: { id, whitelabelAccountId: account.id },
    data: { status },
  })

  if (tenant.count === 0) {
    return NextResponse.json({ success: false, error: 'Tenant não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
