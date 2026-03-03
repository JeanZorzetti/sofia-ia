/**
 * /api/threads/schedule/[id]
 *
 * GET    — busca post agendado por ID
 * PUT    — atualiza (texto, scheduledAt, status, aprovação)
 * DELETE — cancela (soft delete via status=cancelled)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/threads/schedule/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params

    const post = await prisma.threadsScheduledPost.findUnique({ where: { id } })
    if (!post) return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })
    if (post.userId !== auth.id) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    return NextResponse.json({ success: true, data: post })
  } catch (error) {
    console.error('Error fetching scheduled post:', error)
    return NextResponse.json({ error: 'Erro ao buscar post' }, { status: 500 })
  }
}

// PUT /api/threads/schedule/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params

    const post = await prisma.threadsScheduledPost.findUnique({ where: { id } })
    if (!post) return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })
    if (post.userId !== auth.id) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    if (post.status === 'published') {
      return NextResponse.json({ error: 'Posts já publicados não podem ser editados' }, { status: 400 })
    }

    const body = await request.json()
    const { text, scheduledAt, status, approve, metadata } = body

    const updateData: Record<string, unknown> = {}

    if (text !== undefined) {
      if (!text?.trim()) return NextResponse.json({ error: 'text não pode ser vazio' }, { status: 400 })
      if (text.length > 500) return NextResponse.json({ error: `Texto excede 500 chars (${text.length})` }, { status: 400 })
      updateData.text = text.trim()
    }

    if (scheduledAt !== undefined) {
      const d = new Date(scheduledAt)
      if (isNaN(d.getTime())) return NextResponse.json({ error: 'scheduledAt inválido' }, { status: 400 })
      updateData.scheduledAt = d
    }

    if (status !== undefined) {
      const allowed = ['pending', 'cancelled']
      if (!allowed.includes(status)) {
        return NextResponse.json({ error: `status deve ser: ${allowed.join(' | ')}` }, { status: 400 })
      }
      updateData.status = status
    }

    if (approve === true) {
      updateData.approvedBy = auth.id
    }

    if (metadata !== undefined) {
      updateData.metadata = metadata
    }

    const updated = await prisma.threadsScheduledPost.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating scheduled post:', error)
    return NextResponse.json({ error: 'Erro ao atualizar post' }, { status: 500 })
  }
}

// DELETE /api/threads/schedule/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params

    const post = await prisma.threadsScheduledPost.findUnique({ where: { id } })
    if (!post) return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })
    if (post.userId !== auth.id) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    if (post.status === 'published') {
      return NextResponse.json({ error: 'Posts publicados não podem ser cancelados' }, { status: 400 })
    }

    await prisma.threadsScheduledPost.update({
      where: { id },
      data: { status: 'cancelled' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error cancelling scheduled post:', error)
    return NextResponse.json({ error: 'Erro ao cancelar post' }, { status: 500 })
  }
}
