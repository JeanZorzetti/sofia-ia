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
