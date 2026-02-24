import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Calcula a próxima data de execução baseada em uma expressão cron simples.
 * Suporta apenas expressões no formato "min hour dayOfMonth month dayOfWeek".
 */
function getNextRunAt(cronExpr: string): Date {
  // Implementação simplificada para presets comuns
  const now = new Date()
  const next = new Date(now)

  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length !== 5) {
    // Fallback: próxima hora redonda
    next.setHours(next.getHours() + 1, 0, 0, 0)
    return next
  }

  const [min, hour, dayOfMonth, , dayOfWeek] = parts

  // Define minuto e hora
  const targetMin = min === '*' ? 0 : parseInt(min, 10)
  const targetHour = hour === '*' ? now.getHours() : parseInt(hour, 10)

  next.setMinutes(targetMin, 0, 0)
  next.setHours(targetHour)

  // Ajusta para o próximo dia válido
  if (dayOfWeek !== '*') {
    // Dia da semana específico (0=Dom, 1=Seg, ..., 7=Dom)
    const targetDay = parseInt(dayOfWeek, 10) % 7
    const currentDay = now.getDay()
    let daysUntil = (targetDay - currentDay + 7) % 7
    if (daysUntil === 0 && next <= now) daysUntil = 7
    next.setDate(next.getDate() + daysUntil)
  } else if (dayOfMonth !== '*') {
    // Dia do mês específico
    const targetDayOfMonth = parseInt(dayOfMonth, 10)
    next.setDate(targetDayOfMonth)
    if (next <= now) {
      next.setMonth(next.getMonth() + 1)
      next.setDate(targetDayOfMonth)
    }
  } else {
    // Diário: avança para amanhã se já passou
    if (next <= now) {
      next.setDate(next.getDate() + 1)
    }
  }

  return next
}

/**
 * GET /api/dashboard/scheduled-executions
 * Lista agendamentos do usuário autenticado.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const schedules = await prisma.scheduledExecution.findMany({
      where: { userId: auth.id },
      include: {
        orchestration: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: schedules })
  } catch (error: any) {
    console.error('[scheduled-executions] GET error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/dashboard/scheduled-executions
 * Cria um novo agendamento.
 * Body: { orchestrationId, cronExpr, label?, inputTemplate? }
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const { orchestrationId, cronExpr, label, inputTemplate } = body

    if (!orchestrationId || !cronExpr) {
      return NextResponse.json(
        { success: false, error: 'orchestrationId e cronExpr são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar que a orquestração pertence ao usuário
    const orchestration = await prisma.agentOrchestration.findFirst({
      where: { id: orchestrationId, createdBy: auth.id },
    })

    if (!orchestration) {
      return NextResponse.json(
        { success: false, error: 'Orquestração não encontrada' },
        { status: 404 }
      )
    }

    const nextRunAt = getNextRunAt(cronExpr)

    const schedule = await prisma.scheduledExecution.create({
      data: {
        orchestrationId,
        userId: auth.id,
        cronExpr,
        label: label || null,
        inputTemplate: inputTemplate || null,
        nextRunAt,
        isActive: true,
      },
      include: {
        orchestration: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ success: true, data: schedule }, { status: 201 })
  } catch (error: any) {
    console.error('[scheduled-executions] POST error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
