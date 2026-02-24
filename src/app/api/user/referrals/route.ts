import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const count = await prisma.user.count({ where: { referredBy: auth.id } })

    return NextResponse.json({ count, referralLink: `https://sofiaia.roilabs.com.br/register?ref=${auth.id}` })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
