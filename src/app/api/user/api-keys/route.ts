import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const keys = await prisma.apiKey.findMany({
    where: { userId: auth.id },
    select: { id: true, name: true, key: true, status: true, lastUsedAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  // Mascara a chave: mostra só os primeiros 10 e últimos 4 caracteres
  const masked = keys.map(k => ({
    ...k,
    keyPreview: `${k.key.slice(0, 14)}...${k.key.slice(-4)}`,
    key: undefined,
  }))

  return NextResponse.json({ success: true, data: masked })
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const name = (body.name || '').trim()
  if (!name) {
    return NextResponse.json({ success: false, error: 'Nome da chave é obrigatório' }, { status: 400 })
  }

  const count = await prisma.apiKey.count({ where: { userId: auth.id, status: 'active' } })
  if (count >= 10) {
    return NextResponse.json({ success: false, error: 'Limite de 10 chaves ativas atingido' }, { status: 403 })
  }

  const rawKey = `sk_live_${randomBytes(24).toString('hex')}`

  const apiKey = await prisma.apiKey.create({
    data: { name, key: rawKey, userId: auth.id, status: 'active' },
  })

  // Retorna a chave completa APENAS na criação — após isso fica mascarada
  return NextResponse.json(
    { success: true, data: { id: apiKey.id, name: apiKey.name, key: rawKey, createdAt: apiKey.createdAt } },
    { status: 201 }
  )
}
