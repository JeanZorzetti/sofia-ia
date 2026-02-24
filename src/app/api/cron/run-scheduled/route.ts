import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { chatWithAgent } from '@/lib/groq'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const CRON_SECRET = process.env.CRON_SECRET || 'sofia-cron-secret-2026'

/**
 * Calcula a próxima data de execução baseada em uma expressão cron simples.
 */
function getNextRunAt(cronExpr: string, fromDate: Date = new Date()): Date {
  const next = new Date(fromDate)
  const parts = cronExpr.trim().split(/\s+/)

  if (parts.length !== 5) {
    next.setHours(next.getHours() + 1, 0, 0, 0)
    return next
  }

  const [min, hour, dayOfMonth, , dayOfWeek] = parts
  const targetMin = min === '*' ? 0 : parseInt(min, 10)
  const targetHour = hour === '*' ? next.getHours() : parseInt(hour, 10)

  next.setMinutes(targetMin, 0, 0)
  next.setHours(targetHour)

  if (dayOfWeek !== '*') {
    const targetDay = parseInt(dayOfWeek, 10) % 7
    const currentDay = fromDate.getDay()
    let daysUntil = (targetDay - currentDay + 7) % 7
    if (daysUntil === 0) daysUntil = 7 // Sempre próxima semana
    next.setDate(next.getDate() + daysUntil)
  } else if (dayOfMonth !== '*') {
    const targetDayOfMonth = parseInt(dayOfMonth, 10)
    next.setDate(targetDayOfMonth)
    if (next <= fromDate) {
      next.setMonth(next.getMonth() + 1)
      next.setDate(targetDayOfMonth)
    }
  } else {
    // Diário: próximo dia
    next.setDate(next.getDate() + 1)
  }

  return next
}

/**
 * GET /api/cron/run-scheduled
 * Endpoint acionado pelo Vercel Cron a cada hora.
 * Protegido pelo header Authorization: Bearer {CRON_SECRET}.
 */
export async function GET(request: NextRequest) {
  // Verificar autorização do cron
  const authHeader = request.headers.get('Authorization')
  const expectedToken = `Bearer ${CRON_SECRET}`

  if (authHeader !== expectedToken) {
    console.warn('[cron/run-scheduled] Unauthorized attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results: Array<{ scheduleId: string; status: string; error?: string }> = []

  try {
    // Buscar todos os agendamentos ativos que deveriam ter rodado
    const dueSchedules = await prisma.scheduledExecution.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
      include: {
        orchestration: true,
      },
      take: 50, // Limite de segurança
    })

    console.log(`[cron/run-scheduled] Found ${dueSchedules.length} due schedules at ${now.toISOString()}`)

    for (const schedule of dueSchedules) {
      try {
        const orchestration = schedule.orchestration
        const agents = orchestration.agents as Array<{ agentId: string; role: string; prompt?: string }>

        if (!agents || agents.length === 0) {
          throw new Error('Orchestration has no agents')
        }

        // Parsear input template
        let inputText = ''
        try {
          const tmpl = schedule.inputTemplate ? JSON.parse(schedule.inputTemplate) : {}
          inputText = tmpl.text || tmpl.input || JSON.stringify(tmpl)
        } catch {
          inputText = schedule.inputTemplate || ''
        }

        // Criar registro de execução
        const execution = await prisma.orchestrationExecution.create({
          data: {
            orchestrationId: schedule.orchestrationId,
            input: { text: inputText, scheduledExecutionId: schedule.id },
            status: 'running',
          },
        })

        // Executar agentes sequencialmente (simplificado para cron)
        const agentResults: any[] = []
        let conversationHistory: Array<{ role: string; output: string }> = []

        for (const agentStep of agents) {
          if (agentStep.agentId === 'task-splitter') continue

          const agent = await prisma.agent.findUnique({ where: { id: agentStep.agentId } })
          if (!agent) continue

          const contextParts = [`TAREFA: ${inputText}`]
          if (conversationHistory.length > 0) {
            contextParts.push('\nCONTEXTO ANTERIOR:')
            for (const h of conversationHistory) {
              contextParts.push(`\n[${h.role}]: ${h.output}`)
            }
          }
          if (agentStep.prompt) {
            contextParts.push(`\nINSTRUÇÃO: ${agentStep.prompt}`)
          }

          const fullMessage = contextParts.join('\n')
          const stepStart = Date.now()

          const response = await chatWithAgent(agentStep.agentId, [{ role: 'user', content: fullMessage }], {})

          agentResults.push({
            agentId: agent.id,
            agentName: agent.name,
            role: agentStep.role,
            output: response.message,
            durationMs: Date.now() - stepStart,
            tokensUsed: response.usage?.total_tokens || 0,
          })

          conversationHistory.push({ role: agentStep.role, output: response.message })
        }

        const finalOutput = agentResults[agentResults.length - 1]?.output || null

        // Marcar execução como concluída
        await prisma.orchestrationExecution.update({
          where: { id: execution.id },
          data: {
            status: 'completed',
            agentResults,
            output: finalOutput,
            completedAt: new Date(),
            durationMs: Date.now() - execution.startedAt.getTime(),
          },
        })

        // Calcular próximo nextRunAt
        const nextRunAt = getNextRunAt(schedule.cronExpr, now)

        // Atualizar agendamento
        await prisma.scheduledExecution.update({
          where: { id: schedule.id },
          data: {
            lastRunAt: now,
            lastStatus: 'success',
            nextRunAt,
          },
        })

        results.push({ scheduleId: schedule.id, status: 'success' })
        console.log(`[cron/run-scheduled] Schedule ${schedule.id} completed. Next run: ${nextRunAt.toISOString()}`)

      } catch (scheduleError: any) {
        console.error(`[cron/run-scheduled] Schedule ${schedule.id} failed:`, scheduleError)

        // Calcular próximo nextRunAt mesmo em caso de erro
        const nextRunAt = getNextRunAt(schedule.cronExpr, now)

        await prisma.scheduledExecution.update({
          where: { id: schedule.id },
          data: {
            lastRunAt: now,
            lastStatus: 'failed',
            nextRunAt,
          },
        }).catch(() => {})

        results.push({ scheduleId: schedule.id, status: 'failed', error: scheduleError.message })
      }
    }

    return NextResponse.json({
      processed: dueSchedules.length,
      results,
      timestamp: now.toISOString(),
    })

  } catch (error: any) {
    console.error('[cron/run-scheduled] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
