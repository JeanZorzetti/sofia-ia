import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const account = await prisma.whitelabelAccount.findUnique({
    where: { userId: auth.id },
    include: { subTenants: { orderBy: { createdAt: 'desc' } } },
  })

  if (!account) {
    return NextResponse.json({ success: true, data: { account: null, tenants: [] } })
  }

  return NextResponse.json({
    success: true,
    data: { account, tenants: account.subTenants },
  })
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, email, notes } = body

  if (!name || !email) {
    return NextResponse.json(
      { success: false, error: 'Nome e email são obrigatórios' },
      { status: 400 }
    )
  }

  const account = await prisma.whitelabelAccount.findUnique({
    where: { userId: auth.id },
    include: { _count: { select: { subTenants: { where: { status: 'active' } } } } },
  })

  if (!account) {
    return NextResponse.json(
      { success: false, error: 'Conta white-label não encontrada. Entre em contato com o suporte.' },
      { status: 403 }
    )
  }

  if (account._count.subTenants >= account.maxSubTenants) {
    return NextResponse.json(
      { success: false, error: `Limite de ${account.maxSubTenants} clientes atingido para o plano ${account.plan}.` },
      { status: 403 }
    )
  }

  const tenant = await prisma.whitelabelTenant.create({
    data: {
      whitelabelAccountId: account.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      notes: notes?.trim() || null,
    },
  })

  return NextResponse.json({ success: true, data: tenant }, { status: 201 })
}
