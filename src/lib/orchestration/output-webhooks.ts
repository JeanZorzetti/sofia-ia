/**
 * Output Webhooks — dispatch notifications after successful orchestration/team execution.
 *
 * Supported output types:
 *  - webhook: HTTP POST to a custom URL (with HMAC X-Polaris-Signature: sha256=xxx signing)
 *  - email:   send via Resend (uses the existing email utility)
 *  - slack:   HTTP POST to a Slack Incoming Webhook URL
 *
 * Configuration is stored in AgentOrchestration.config / Team.config JSON field:
 * {
 *   "outputWebhooks": [
 *     { "type": "webhook", "url": "https://...", "enabled": true, "secret": "optional-signing-secret" },
 *     { "type": "email",   "to": "user@example.com", "subject": "Orquestração concluída", "enabled": true },
 *     { "type": "slack",   "webhookUrl": "https://hooks.slack.com/services/...", "enabled": true }
 *   ]
 * }
 *
 * HMAC verification example (receiver side):
 *   const sig = req.headers['x-polaris-signature']  // "sha256=abc123..."
 *   const computed = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
 *   if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(computed))) throw new Error('Invalid signature')
 */

import { createHmac } from 'crypto'

export type OutputWebhookConfig =
  | { type: 'webhook'; url: string; enabled: boolean; secret?: string }
  | { type: 'email'; to: string; subject?: string; enabled: boolean }
  | { type: 'slack'; webhookUrl: string; enabled: boolean }

export interface EntitySummary {
  id: string
  name: string
}

export interface ExecutionSummary {
  id: string
  durationMs: number
  tokensUsed: number
}

export interface DispatchOpts {
  /** Full completion phrase used in email/slack (avoids gender agreement issues,
   *  e.g. 'Time concluído' vs 'Orquestração concluída'). Default below. */
  completedLabel?: string
  /** Webhook payload event name. Default 'orchestration.completed'. */
  event?: string
}

/**
 * Build a human-readable text summary of the final output.
 */
function buildOutputText(finalOutput: any): string {
  if (!finalOutput) return '(sem saída)'
  if (typeof finalOutput === 'string') return finalOutput.slice(0, 2000)
  if (finalOutput.result) return String(finalOutput.result).slice(0, 2000)
  if (finalOutput.output) return String(finalOutput.output).slice(0, 2000)
  if (finalOutput.consensus) return String(finalOutput.consensus).slice(0, 2000)
  return JSON.stringify(finalOutput).slice(0, 2000)
}

/**
 * Dispatch a single webhook (HTTP POST).
 */
async function dispatchWebhook(
  cfg: Extract<OutputWebhookConfig, { type: 'webhook' }>,
  entity: EntitySummary,
  execution: ExecutionSummary,
  finalOutput: any,
  opts: DispatchOpts,
): Promise<void> {
  const payload = {
    event: opts.event ?? 'orchestration.completed',
    id: entity.id,
    name: entity.name,
    executionId: execution.id,
    durationMs: execution.durationMs,
    tokensUsed: execution.tokensUsed,
    output: finalOutput,
    timestamp: new Date().toISOString(),
  }

  const body = JSON.stringify(payload)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  const signingSecret = cfg.secret || process.env.WEBHOOK_SIGNING_SECRET
  if (signingSecret) {
    const hmac = createHmac('sha256', signingSecret)
    hmac.update(body)
    const digest = hmac.digest('hex')
    headers['X-Polaris-Signature'] = `sha256=${digest}`
  }

  const res = await fetch(cfg.url, { method: 'POST', headers, body, signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`Webhook POST to ${cfg.url} returned HTTP ${res.status}`)
}

/**
 * Dispatch a Slack Incoming Webhook.
 */
async function dispatchSlack(
  cfg: Extract<OutputWebhookConfig, { type: 'slack' }>,
  entity: EntitySummary,
  execution: ExecutionSummary,
  finalOutput: any,
  opts: DispatchOpts,
): Promise<void> {
  const label = opts.completedLabel ?? 'Orquestração concluída'
  const outputText = buildOutputText(finalOutput)
  const durationSec = (execution.durationMs / 1000).toFixed(1)

  const body = {
    text: `✅ *${label}:* ${entity.name}`,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `✅ *${label}:* ${entity.name}\n⏱ Duração: ${durationSec}s | 🔤 Tokens: ${execution.tokensUsed}` } },
      { type: 'section', text: { type: 'mrkdwn', text: `*Resultado:*\n${outputText}` } },
    ],
  }

  const res = await fetch(cfg.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`Slack webhook returned HTTP ${res.status}`)
}

/**
 * Dispatch an email notification via Resend.
 * Requires RESEND_API_KEY in environment.
 */
async function dispatchEmail(
  cfg: Extract<OutputWebhookConfig, { type: 'email' }>,
  entity: EntitySummary,
  execution: ExecutionSummary,
  finalOutput: any,
  opts: DispatchOpts,
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) { console.warn('[OutputWebhooks] RESEND_API_KEY not set — skipping email dispatch'); return }

  const label = opts.completedLabel ?? 'Orquestração concluída'
  const outputText = buildOutputText(finalOutput)
  const durationSec = (execution.durationMs / 1000).toFixed(1)
  const subject = cfg.subject || `${label}: ${entity.name}`

  const html = `
    <h2>✅ ${label}</h2>
    <p><strong>Nome:</strong> ${entity.name}</p>
    <p><strong>Duração:</strong> ${durationSec}s</p>
    <p><strong>Tokens utilizados:</strong> ${execution.tokensUsed}</p>
    <h3>Resultado:</h3>
    <pre style="background:#f4f4f4;padding:12px;border-radius:6px;white-space:pre-wrap">${outputText}</pre>
    <hr/>
    <small>Enviado por <a href="https://polarisia.com.br">Polaris IA</a></small>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Polaris IA <noreply@polarisia.com.br>', to: [cfg.to], subject, html }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) { const text = await res.text().catch(() => ''); throw new Error(`Resend email returned HTTP ${res.status}: ${text}`) }
}

/**
 * Main entry point — read outputWebhooks from entity.config and dispatch each enabled output.
 * All errors are caught per-output to avoid blocking the main response.
 */
export interface DispatchRecord {
  type: string
  destination: string
  status: 'sent' | 'failed'
  error?: string
  sentAt: string
}

/**
 * Main entry point — read outputWebhooks from entity.config and dispatch each enabled output.
 * Returns an array of dispatch records for persistence.
 */
export async function dispatchOutputWebhooks(
  entity: EntitySummary & { config: any },
  execution: ExecutionSummary,
  finalOutput: any,
  opts: DispatchOpts = {},
): Promise<DispatchRecord[]> {
  const config = entity.config as Record<string, any> | null
  const outputWebhooks: OutputWebhookConfig[] = config?.outputWebhooks ?? []
  if (!outputWebhooks.length) return []
  const enabled = outputWebhooks.filter((w) => w.enabled)
  if (!enabled.length) return []

  console.log(`[OutputWebhooks] Dispatching ${enabled.length} output(s) for ${entity.id}`)

  const results = await Promise.allSettled(
    enabled.map(async (cfg): Promise<DispatchRecord> => {
      const sentAt = new Date().toISOString()
      const destination =
        cfg.type === 'email' ? (cfg.to ?? '') :
        cfg.type === 'slack' ? 'slack-webhook' :
        (cfg.url ?? '')
      try {
        if (cfg.type === 'webhook') { await dispatchWebhook(cfg, entity, execution, finalOutput, opts) }
        else if (cfg.type === 'slack') { await dispatchSlack(cfg, entity, execution, finalOutput, opts) }
        else if (cfg.type === 'email') { await dispatchEmail(cfg, entity, execution, finalOutput, opts) }
        return { type: cfg.type, destination, status: 'sent', sentAt }
      } catch (err: any) {
        console.error(`[OutputWebhooks] Failed to dispatch ${cfg.type}:`, err)
        return { type: cfg.type, destination, status: 'failed', error: err?.message ?? 'Unknown error', sentAt }
      }
    })
  )

  return results.map((r) => (r.status === 'fulfilled' ? r.value : { type: 'unknown', destination: '', status: 'failed' as const, error: 'Promise rejected', sentAt: new Date().toISOString() }))
}
