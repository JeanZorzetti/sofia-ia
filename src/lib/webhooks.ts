/**
 * Webhook notification system for Sofia AI.
 * Supports Slack, Discord, Email (via Resend), and generic HTTP webhooks.
 */

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export type WebhookEvent =
  | 'orchestration_completed'
  | 'orchestration_failed'
  | 'agent_response'
  | 'execution_started'

interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  data: Record<string, unknown>
}

// ─── Slack ────────────────────────────────────────────────
async function sendSlackWebhook(url: string, payload: WebhookPayload): Promise<boolean> {
  const eventEmojis: Record<WebhookEvent, string> = {
    orchestration_completed: ':white_check_mark:',
    orchestration_failed: ':x:',
    agent_response: ':robot_face:',
    execution_started: ':rocket:',
  }

  const text = `${eventEmojis[payload.event] || ':bell:'} *Sofia AI — ${payload.event.replace(/_/g, ' ')}*\n${
    payload.data.orchestrationName
      ? `Orquestração: *${payload.data.orchestrationName}*`
      : ''
  }\nTimestamp: ${new Date(payload.timestamp).toLocaleString('pt-BR')}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    return res.ok
  } catch {
    return false
  }
}

// ─── Discord ──────────────────────────────────────────────
async function sendDiscordWebhook(url: string, payload: WebhookPayload): Promise<boolean> {
  const colors: Record<WebhookEvent, number> = {
    orchestration_completed: 0x22c55e, // green
    orchestration_failed: 0xef4444,    // red
    agent_response: 0x3b82f6,          // blue
    execution_started: 0xa855f7,       // purple
  }

  const embed = {
    title: `Sofia AI — ${payload.event.replace(/_/g, ' ')}`,
    color: colors[payload.event] || 0x6366f1,
    fields: Object.entries(payload.data)
      .slice(0, 5)
      .map(([key, value]) => ({
        name: key.replace(/_/g, ' '),
        value: String(value).slice(0, 200),
        inline: true,
      })),
    timestamp: payload.timestamp,
    footer: { text: 'Sofia AI by ROI Labs' },
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })
    return res.ok
  } catch {
    return false
  }
}

// ─── Email ────────────────────────────────────────────────
async function sendEmailWebhook(email: string, payload: WebhookPayload): Promise<boolean> {
  const eventLabels: Record<WebhookEvent, string> = {
    orchestration_completed: 'Orquestracao Concluida',
    orchestration_failed: 'Falha na Orquestracao',
    agent_response: 'Resposta do Agente',
    execution_started: 'Execucao Iniciada',
  }

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 24px; border-radius: 12px;">
      <h2 style="color: #fff; margin: 0 0 16px;">Sofia AI — ${eventLabels[payload.event] || payload.event}</h2>
      <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        ${Object.entries(payload.data)
          .slice(0, 8)
          .map(
            ([key, value]) =>
              `<p style="margin: 4px 0; font-size: 14px;"><strong style="color: #94a3b8;">${key}:</strong> ${String(value).slice(0, 500)}</p>`
          )
          .join('')}
      </div>
      <p style="color: #475569; font-size: 12px;">Evento disparado em: ${new Date(payload.timestamp).toLocaleString('pt-BR')}</p>
      <p style="color: #475569; font-size: 12px;">Acesse: <a href="https://sofiaia.roilabs.com.br/dashboard" style="color: #6d28d9;">sofiaia.roilabs.com.br</a></p>
    </div>
  `

  const result = await sendEmail({
    to: email,
    subject: `Sofia AI — ${eventLabels[payload.event] || payload.event}`,
    html,
  })

  return result.success
}

// ─── Generic HTTP ─────────────────────────────────────────
async function sendGenericWebhook(url: string, payload: WebhookPayload): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sofia-Event': payload.event,
        'X-Sofia-Timestamp': payload.timestamp,
      },
      body: JSON.stringify(payload),
    })
    return res.ok
  } catch {
    return false
  }
}

// ─── Main Dispatcher ──────────────────────────────────────
/**
 * Send webhook notifications to all active configs for a user/event combination.
 * Non-throwing: logs errors but never crashes the caller.
 */
export async function sendWebhookNotification(
  event: WebhookEvent,
  data: Record<string, unknown>,
  userId: string
): Promise<void> {
  let configs
  try {
    configs = await prisma.webhookConfig.findMany({
      where: { userId, isActive: true, events: { has: event } },
    })
  } catch (err) {
    console.error('[Webhooks] Failed to fetch configs:', err)
    return
  }

  if (!configs.length) return

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  }

  const results = await Promise.allSettled(
    configs.map(async (config) => {
      switch (config.type) {
        case 'slack':
          if (config.url) return sendSlackWebhook(config.url, payload)
          break
        case 'discord':
          if (config.url) return sendDiscordWebhook(config.url, payload)
          break
        case 'email':
          if (config.email) return sendEmailWebhook(config.email, payload)
          break
        case 'generic':
          if (config.url) return sendGenericWebhook(config.url, payload)
          break
      }
      return false
    })
  )

  const failed = results.filter(
    (r): boolean => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value)
  )
  if (failed.length) {
    console.warn(`[Webhooks] ${failed.length}/${configs.length} webhook(s) failed for event: ${event}`)
  }
}
