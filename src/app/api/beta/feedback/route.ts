import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/beta/feedback — salva feedback de beta tester
export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { message, category, page } = body

  if (!message || message.trim().length < 5) {
    return NextResponse.json({ error: 'Mensagem deve ter pelo menos 5 caracteres' }, { status: 400 })
  }

  try {
    const feedback = await prisma.betaFeedback.create({
      data: {
        userId: auth.id,
        message: message.trim(),
        category: category || 'general',
        page: page || null,
      },
    })

    return NextResponse.json({ success: true, feedbackId: feedback.id })
  } catch (error) {
    console.error('[beta/feedback]', error)
    return NextResponse.json({ error: 'Erro ao salvar feedback' }, { status: 500 })
  }
}
