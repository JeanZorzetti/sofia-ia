/**
 * /api/threads/campaigns
 *
 * GET  — lista campanhas do usuário
 * POST — cria nova campanha
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const campaigns = await prisma.threadsCampaign.findMany({
      where: {
        userId: auth.id,
        ...(status ? { status } : {}),
      },
      include: {
        posts: { orderBy: { position: 'asc' } },
      },
      orderBy: { startDate: 'desc' },
    })

    return NextResponse.json({ success: true, data: campaigns })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json({ error: 'Erro ao buscar campanhas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { name, objective, theme, description, startDate, endDate, posts } = body

    if (!name?.trim()) return NextResponse.json({ error: 'name é obrigatório' }, { status: 400 })
    if (!theme?.trim()) return NextResponse.json({ error: 'theme é obrigatório' }, { status: 400 })
    if (!startDate || !endDate) return NextResponse.json({ error: 'startDate e endDate são obrigatórios' }, { status: 400 })

    const start = new Date(startDate)
    const end = new Date(endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Datas inválidas' }, { status: 400 })
    }
    if (end <= start) {
      return NextResponse.json({ error: 'endDate deve ser após startDate' }, { status: 400 })
    }

    const campaign = await prisma.threadsCampaign.create({
      data: {
        userId: auth.id,
        name: name.trim(),
        objective: objective ?? 'awareness',
        theme: theme.trim(),
        description: description?.trim() || null,
        startDate: start,
        endDate: end,
        status: 'planning',
        posts: posts?.length
          ? {
              create: posts.map((p: { tema: string; angle?: string; scheduledAt?: string }, i: number) => ({
                position: i,
                tema: p.tema,
                angle: p.angle || null,
                status: 'draft',
                scheduledAt: p.scheduledAt ? new Date(p.scheduledAt) : null,
              })),
            }
          : undefined,
      },
      include: { posts: { orderBy: { position: 'asc' } } },
    })

    return NextResponse.json({ success: true, data: campaign }, { status: 201 })
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json({ error: 'Erro ao criar campanha' }, { status: 500 })
  }
}
