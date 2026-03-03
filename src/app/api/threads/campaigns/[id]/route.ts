/**
 * /api/threads/campaigns/[id]
 *
 * GET    — busca campanha por ID (com posts)
 * PUT    — atualiza campanha (nome, status, posts)
 * DELETE — cancela campanha
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params

    const campaign = await prisma.threadsCampaign.findUnique({
      where: { id },
      include: {
        posts: {
          orderBy: { position: 'asc' },
          include: { scheduledPost: true },
        },
      },
    })

    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    if (campaign.userId !== auth.id) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    return NextResponse.json({ success: true, data: campaign })
  } catch (error) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json({ error: 'Erro ao buscar campanha' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params

    const campaign = await prisma.threadsCampaign.findUnique({ where: { id } })
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    if (campaign.userId !== auth.id) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const body = await request.json()
    const { name, status, description, metadata } = body

    const validStatuses = ['planning', 'approved', 'active', 'completed', 'cancelled']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: `status deve ser: ${validStatuses.join(' | ')}` }, { status: 400 })
    }

    const updated = await prisma.threadsCampaign.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(status ? { status } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(metadata ? { metadata } : {}),
      },
      include: { posts: { orderBy: { position: 'asc' } } },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating campaign:', error)
    return NextResponse.json({ error: 'Erro ao atualizar campanha' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params

    const campaign = await prisma.threadsCampaign.findUnique({ where: { id } })
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    if (campaign.userId !== auth.id) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    if (campaign.status === 'active') {
      return NextResponse.json({ error: 'Campanhas ativas não podem ser deletadas. Cancele primeiro.' }, { status: 400 })
    }

    await prisma.threadsCampaign.update({
      where: { id },
      data: { status: 'cancelled' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting campaign:', error)
    return NextResponse.json({ error: 'Erro ao cancelar campanha' }, { status: 500 })
  }
}
