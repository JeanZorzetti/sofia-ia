import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST /api/whitelabel/account — provisiona conta white-label para admin
export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (auth.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Apenas admins podem ativar a conta white-label' }, { status: 403 })
  }

  const existing = await prisma.whitelabelAccount.findUnique({ where: { userId: auth.id } })
  if (existing) {
    return NextResponse.json({ success: true, data: existing })
  }

  const account = await prisma.whitelabelAccount.create({
    data: {
      userId: auth.id,
      plan: 'enterprise',
      status: 'active',
      maxSubTenants: 999,
      branding: {},
    },
  })

  return NextResponse.json({ success: true, data: account }, { status: 201 })
}

// PATCH /api/whitelabel/account — atualiza branding e customDomain
export async function PATCH(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { platformName, logoUrl, primaryColor, customDomain } = body

  const account = await prisma.whitelabelAccount.findUnique({ where: { userId: auth.id } })
  if (!account) {
    return NextResponse.json({ success: false, error: 'Conta white-label não encontrada' }, { status: 404 })
  }

  const currentBranding = (account.branding as Record<string, string>) || {}
  const updatedBranding = {
    ...currentBranding,
    ...(platformName !== undefined && { platformName }),
    ...(logoUrl !== undefined && { logoUrl }),
    ...(primaryColor !== undefined && { primaryColor }),
  }

  const updated = await prisma.whitelabelAccount.update({
    where: { id: account.id },
    data: {
      branding: updatedBranding,
      ...(customDomain !== undefined && { customDomain: customDomain || null }),
    },
  })

  return NextResponse.json({ success: true, data: updated })
}
