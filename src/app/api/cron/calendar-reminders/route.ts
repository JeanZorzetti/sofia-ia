/**
 * GET /api/cron/calendar-reminders
 * Cron que varre eventos do Google Calendar e envia lembretes WhatsApp.
 *
 * Janelas de lembrete:
 *  - 2 horas antes  (timeMin = now+115min, timeMax = now+120min)
 *  - 5 minutos antes (timeMin = now, timeMax = now+5min)
 *
 * O evento armazena o remoteJid do WhatsApp no campo description.
 * Acionado a cada 5 minutos pelo Vercel Cron ou cron externo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { listUpcomingEvents } from '@/lib/google-calendar'
import { resolveAccountByAgent } from '@/lib/whatsapp-cloud-service'
import { sendWhatsAppTemplate } from '@/lib/whatsapp-templates'
import { verifyCronAuth } from '@/lib/authz'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Lembretes são proativos (fora da janela de 24h) → sempre via template HSM.
// Variáveis posicionais: {{1}}=evento, {{2}}=quando, {{3}}=link
const REMINDER_TEMPLATE = process.env.WHATSAPP_REMINDER_TEMPLATE || 'appointment_reminder_pt'
const TEMPLATE_LANG = process.env.WHATSAPP_TEMPLATE_LANG || 'pt_BR'

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const reminders: Array<{ type: string; contact: string; eventSummary: string }> = []

  try {
    // Buscar todos os agentes com calendarEnabled + calendarUserId
    const agents = await prisma.agent.findMany({
      where: { status: 'active' },
      select: { id: true, config: true, channels: { where: { channel: 'whatsapp', isActive: true }, select: { config: true } } },
    })

    for (const agent of agents) {
      const config = (agent.config || {}) as Record<string, unknown>
      if (!config.calendarEnabled || !config.calendarUserId) continue

      const calendarUserId = config.calendarUserId as string
      const account = await resolveAccountByAgent(agent.id)
      if (!account) continue

      // ── 2 horas antes (115–120 min) ───────────────────────────────────────
      const twoHrMin = new Date(now.getTime() + 115 * 60 * 1000).toISOString()
      const twoHrMax = new Date(now.getTime() + 120 * 60 * 1000).toISOString()

      try {
        const events2h = await listUpcomingEvents(calendarUserId, twoHrMin, twoHrMax)
        for (const event of events2h) {
          const remoteJid = event.description?.trim()
          if (!remoteJid) continue
          const to = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '')

          await sendWhatsAppTemplate(account, to, REMINDER_TEMPLATE, TEMPLATE_LANG, [
            event.summary,
            '2 horas',
            event.hangoutLink || 'sem link',
          ])
          reminders.push({ type: '2h', contact: to, eventSummary: event.summary })
        }
      } catch (err) {
        console.error('[calendar-reminders] Erro 2h:', err)
      }

      // ── 5 minutos antes (0–5 min) ─────────────────────────────────────────
      const fiveMinMax = new Date(now.getTime() + 5 * 60 * 1000).toISOString()

      try {
        const events5m = await listUpcomingEvents(calendarUserId, now.toISOString(), fiveMinMax)
        for (const event of events5m) {
          const remoteJid = event.description?.trim()
          if (!remoteJid) continue
          const to = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '')

          await sendWhatsAppTemplate(account, to, REMINDER_TEMPLATE, TEMPLATE_LANG, [
            event.summary,
            '5 minutos',
            event.hangoutLink || 'sem link',
          ])
          reminders.push({ type: '5min', contact: to, eventSummary: event.summary })
        }
      } catch (err) {
        console.error('[calendar-reminders] Erro 5min:', err)
      }
    }

    return NextResponse.json({ success: true, reminders, timestamp: now.toISOString() })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno'
    console.error('[calendar-reminders] Fatal:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
