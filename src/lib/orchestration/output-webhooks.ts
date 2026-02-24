/**
 * Output Webhooks — dispatch notifications after successful orchestration execution.
 *
 * Supported output types:
 *  - webhook: HTTP POST to a custom URL (with HMAC X-Sofia-Signature: sha256=xxx signing)
 *  - email:   send via Resend (uses the existing email utility)
 *  - slack:   HTTP POST to a Slack Incoming Webhook URL
 *
 * Configuration is stored in AgentOrchestration.config JSON field:
 * {
 *   "outputWebhooks": [
 *     { "type": "webhook", "url": "https://...", "enabled": true, "secret": "optional-signing-secret" },
 *     { "type": "email",   "to": "user@example.com", "subject": "Orquestração concluída", "enabled": true },
 *     { "type": "slack",   "webhookUrl": "https://hooks.slack.com/services/...", "enabled": true }
 *   ]
 * }
 *
 * HMAC verification example (receiver side):
 *   const sig = req.headers['x-sofia-signature']  // "sha256=abc123..."
 *   const computed = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
 *   if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(computed))) throw new Error('Invalid signature')
 */

import { createHmac } from 'crypto'

export type OutputWebhookConfig =
  | { type: 'webhook'; url: string; enabled: boolean; secret?: string }
  | { type: 'email'; to: string; subject?: string; enabled: boolean }
  | { type: 'slack'; webhookUrl: string; enabled: boolean }

export interface OrchestrationSummary {
  id: string
  name: string
}

export interface ExecutionSummary {
  id: string
  durationMs: number
  tokensUsed: number
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
  orchestration: OrchestrationSummary,
  execution: ExecutionSummary,
  finalOutput: any
): Promise<void> {
  const payload = {
    event: 'orchestration.completed',
    orchestrationId: orchestration.id,
    orchestrationName: orchestration.name,
    executionId: execution.id,
    durationMs: execution.durationMs,
    tokensUsed: execution.tokensUsed,
    output: finalOutput,
    timestamp: new Date().toISOString(),
  }

  const body = JSON.stringify(payload)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  // Sign the payload with HMAC-SHA256 if a secret is configured
  const signingSecret = cfg.secret || process.env.WEBHOOK_SIGNING_SECRET
  if (signingSecret) {
    const hmac = createHmac('sha256', signingSecret)
    hmac.update(body)
    const digest = hmac.digest('hex')
    headers['X-Sofia-Signature'] = `sha256=${digest}`
  }

  const res = await fetch(cfg.url, {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    throw new Error(`Webhook POST to ${cfg.url} returned HTTP ${res.status}`)
  }
}

/**
 * Dispatch a Slack Incoming Webhook.
 */
async function dispatchSlack(
  cfg: Extract<OutputWebhookConfig, { type: 'slack' }>,
  orchestration: OrchestrationSummary,
  execution: ExecutionSummary,
  finalOutput: any
): Promise<void> {
  const outputText = buildOutputText(finalOutput)
  const durationSec = (execution.durationMs / 1000).toFixed(1)

  const body = {
    text: `✅ *Orquestração concluída:* ${orchestration.name}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ *Orquestração concluída:* ${orchestration.name}\n⏱ Duração: ${durationSec}s | 🔤 Tokens: ${execution.tokensUsed}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Resultado:*\n${outputText}`,
        },
      },
    ],
  }

  const res = await fetch(cfg.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    throw new Error(`Slack webhook returned HTTP ${res.status}`)
  }
}

/**
 * Dispatch an email notification via Resend.
 * Requires RESEND_API_KEY in environment.
 */
async function dispatchEmail(
  cfg: Extract<OutputWebhookConfig, { type: 'email' }>,
  orchestration: OrchestrationSummary,
  execution: ExecutionSummary,
  finalOutput: any
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.warn('[OutputWebhooks] RESEND_API_KEY not set — skipping email dispatch')
    return
  }

  const outputText = buildOutputText(finalOutput)
  const durationSec = (execution.durationMs / 1000).toFixed(1)
  const subject = cfg.subject || `Orquestração "${orchestration.name}" concluída`

  const html = `
    <h2>✅ Orquestração concluída</h2>
    <p><strong>Nome:</strong> ${orchestration.name}</p>
    <p><strong>Duração:</strong> ${durationSec}s</p>
    <p><strong>Tokens utilizados:</strong> ${execution.tokensUsed}</p>
    <h3>Resultado:</h3>
    <pre style="background:#f4f4f4;padding:12px;border-radius:6px;white-space:pre-wrap">${outputText}</pre>
    <hr/>
    <small>Enviado por <a href="https://sofiaia.roilabs.com.br">Sofia AI</a></small>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Sofia AI <noreply@sofiaia.roilabs.com.br>',
      to: [cfg.to],
      subject,
      html,
    }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Resend email returned HTTP ${res.status}: ${text}`)
  }
}

/**
 * Main entry point — read outputWebhooks from orchestration.config and dispatch each enabled output.
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
 * Main entry point — read outputWebhooks from orchestration.config and dispatch each enabled output.
 * Returns an array of dispatch records for persistence.
 */
export async function dispatchOutputWebhooks(
  orchestration: OrchestrationSummary & { config: any },
  execution: ExecutionSummary,
  finalOutput: any
): Promise<DispatchRecord[]> {
  const config = orchestration.config as Record<string, any> | null
  const outputWebhooks: OutputWebhookConfig[] = config?.outputWebhooks ?? []

  if (!outputWebhooks.length) return []

  const enabled = outputWebhooks.filter((w) => w.enabled)
  if (!enabled.length) return []

  console.log(`[OutputWebhooks] Dispatching ${enabled.length} output(s) for orchestration ${orchestration.id}`)

  const results = await Promise.allSettled(
    enabled.map(async (cfg): Promise<DispatchRecord> => {
      const sentAt = new Date().toISOString()
      const destination =
        cfg.type === 'email' ? (cfg.to ?? '') :
        cfg.type === 'slack' ? 'slack-webhook' :
        (cfg.url ?? '')
      try {
        if (cfg.type === 'webhook') {
          await dispatchWebhook(cfg, orchestration, execution, finalOutput)
          console.log(`[OutputWebhooks] webhook → ${cfg.url} ✓`)
        } else if (cfg.type === 'slack') {
          await dispatchSlack(cfg, orchestration, execution, finalOutput)
          console.log(`[OutputWebhooks] slack webhook ✓`)
        } else if (cfg.type === 'email') {
          await dispatchEmail(cfg, orchestration, execution, finalOutput)
          console.log(`[OutputWebhooks] email → ${cfg.to} ✓`)
        }
        return { type: cfg.type, destination, status: 'sent', sentAt }
      } catch (err: any) {
        console.error(`[OutputWebhooks] Failed to dispatch ${cfg.type}:`, err)
        return { type: cfg.type, destination, status: 'failed', error: err?.message ?? 'Unknown error', sentAt }
      }
    })
  )

  return results.map((r) => (r.status === 'fulfilled' ? r.value : { type: 'unknown', destination: '', status: 'failed' as const, error: 'Promise rejected', sentAt: new Date().toISOString() }))
}
