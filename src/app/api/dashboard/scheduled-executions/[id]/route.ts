import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/dashboard/scheduled-executions/[id]
 * Atualiza um agendamento (label, cronExpr, isActive, inputTemplate).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const body = await request.json().catch(() => ({}))
    const { label, cronExpr, isActive, inputTemplate } = body

    const existing = await prisma.scheduledExecution.findFirst({
      where: { id, userId: auth.id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Agendamento não encontrado' }, { status: 404 })
    }

    const updateData: Record<string, any> = {}
    if (label !== undefined) updateData.label = label
    if (cronExpr !== undefined) {
      updateData.cronExpr = cronExpr
      // Recalcular nextRunAt quando o cron muda
      updateData.nextRunAt = calcNextRun(cronExpr)
    }
    if (isActive !== undefined) updateData.isActive = isActive
    if (inputTemplate !== undefined) updateData.inputTemplate = inputTemplate

    const updated = await prisma.scheduledExecution.update({
      where: { id },
      data: updateData,
      include: { orchestration: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('[scheduled-executions/id] PATCH error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/dashboard/scheduled-executions/[id]
 * Remove um agendamento.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const existing = await prisma.scheduledExecution.findFirst({
      where: { id, userId: auth.id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Agendamento não encontrado' }, { status: 404 })
    }

    await prisma.scheduledExecution.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[scheduled-executions/id] DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

function calcNextRun(cronExpr: string): Date {
  const now = new Date()
  const next = new Date(now)
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length !== 5) {
    next.setHours(next.getHours() + 1, 0, 0, 0)
    return next
  }
  const [min, hour, dayOfMonth, , dayOfWeek] = parts
  const targetMin = min === '*' ? 0 : parseInt(min, 10)
  const targetHour = hour === '*' ? now.getHours() : parseInt(hour, 10)
  next.setMinutes(targetMin, 0, 0)
  next.setHours(targetHour)
  if (dayOfWeek !== '*') {
    const targetDay = parseInt(dayOfWeek, 10) % 7
    const currentDay = now.getDay()
    let daysUntil = (targetDay - currentDay + 7) % 7
    if (daysUntil === 0 && next <= now) daysUntil = 7
    next.setDate(next.getDate() + daysUntil)
  } else if (dayOfMonth !== '*') {
    const targetDayOfMonth = parseInt(dayOfMonth, 10)
    next.setDate(targetDayOfMonth)
    if (next <= now) {
      next.setMonth(next.getMonth() + 1)
      next.setDate(targetDayOfMonth)
    }
  } else {
    if (next <= now) next.setDate(next.getDate() + 1)
  }
  return next
}
