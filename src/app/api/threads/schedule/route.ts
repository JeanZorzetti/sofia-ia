/**
 * /api/threads/schedule
 *
 * GET  — lista posts agendados do usuário
 * POST — cria novo post agendado
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/threads/schedule
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // pending | published | failed | cancelled
    const from = searchParams.get('from')     // ISO date
    const to = searchParams.get('to')         // ISO date

    const where: Record<string, unknown> = { userId: auth.id }
    if (status) where.status = status
    if (from || to) {
      where.scheduledAt = {}
      if (from) (where.scheduledAt as Record<string, unknown>).gte = new Date(from)
      if (to) (where.scheduledAt as Record<string, unknown>).lte = new Date(to)
    }

    const posts = await prisma.threadsScheduledPost.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
    })

    return NextResponse.json({ success: true, data: posts })
  } catch (error) {
    console.error('Error fetching scheduled posts:', error)
    return NextResponse.json({ error: 'Erro ao buscar posts agendados' }, { status: 500 })
  }
}

// POST /api/threads/schedule
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { text, scheduledAt, createdBy, metadata } = body

    if (!text?.trim()) {
      return NextResponse.json({ error: 'text é obrigatório' }, { status: 400 })
    }
    if (text.length > 500) {
      return NextResponse.json({ error: `Texto excede 500 caracteres (${text.length})` }, { status: 400 })
    }
    if (!scheduledAt) {
      return NextResponse.json({ error: 'scheduledAt é obrigatório' }, { status: 400 })
    }

    const scheduledDate = new Date(scheduledAt)
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: 'scheduledAt inválido' }, { status: 400 })
    }
    if (scheduledDate <= new Date()) {
      return NextResponse.json({ error: 'scheduledAt deve ser no futuro' }, { status: 400 })
    }

    const post = await prisma.threadsScheduledPost.create({
      data: {
        userId: auth.id,
        text: text.trim(),
        scheduledAt: scheduledDate,
        createdBy: createdBy || 'user',
        metadata: metadata || {},
        status: 'pending',
      },
    })

    return NextResponse.json({ success: true, data: post }, { status: 201 })
  } catch (error) {
    console.error('Error creating scheduled post:', error)
    return NextResponse.json({ error: 'Erro ao criar post agendado' }, { status: 500 })
  }
}
