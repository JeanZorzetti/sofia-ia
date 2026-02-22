/**
 * Email service using Resend API.
 * Docs: https://resend.com/docs
 *
 * If RESEND_API_KEY is not set, emails are logged to console (dev mode).
 * Set RESEND_FROM_EMAIL to your verified sender domain.
 */

const RESEND_API_URL = 'https://api.resend.com/emails'

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
}

interface ResendResponse {
  id: string
}

/**
 * Send an email via Resend.
 * Falls back to console.log if RESEND_API_KEY is not configured.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const from = options.from || process.env.RESEND_FROM_EMAIL || 'Sofia IA <noreply@roilabs.com.br>'

  if (!apiKey) {
    // Dev fallback — log the email to console
    console.log('[Email DEV MODE] Would send email:', {
      from,
      to: options.to,
      subject: options.subject,
      html: options.html.substring(0, 200) + '...',
    })
    return { success: true, id: 'dev-mode-no-id' }
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        ...(options.replyTo ? { reply_to: options.replyTo } : {}),
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[Email] Resend API error:', res.status, errorText)
      return { success: false, error: `Resend error ${res.status}: ${errorText}` }
    }

    const data = (await res.json()) as ResendResponse
    return { success: true, id: data.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Email] Send failed:', msg)
    return { success: false, error: msg }
  }
}

// ─── Email Templates ──────────────────────────────────────

/**
 * Welcome email HTML template sent after signup/onboarding.
 */
export function buildWelcomeEmail(userName: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bem-vindo a Sofia IA</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #6d28d9 0%, #3b82f6 100%); padding: 40px 32px; text-align: center; }
    .header h1 { color: #fff; font-size: 28px; font-weight: 700; margin: 0 0 8px; }
    .header p { color: rgba(255,255,255,0.8); font-size: 16px; margin: 0; }
    .body { padding: 32px; }
    .body h2 { color: #f1f5f9; font-size: 20px; margin: 0 0 12px; }
    .body p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
    .step { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; padding: 16px; background: #0f172a; border-radius: 8px; border-left: 3px solid #6d28d9; }
    .step-num { background: #6d28d9; color: #fff; font-weight: 700; font-size: 14px; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .step-text h3 { color: #e2e8f0; font-size: 15px; font-weight: 600; margin: 0 0 4px; }
    .step-text p { color: #94a3b8; font-size: 14px; margin: 0; }
    .cta { text-align: center; margin: 32px 0 0; }
    .cta a { display: inline-block; background: linear-gradient(135deg, #6d28d9, #3b82f6); color: #fff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px; }
    .footer { padding: 24px 32px; text-align: center; border-top: 1px solid #334155; }
    .footer p { color: #475569; font-size: 13px; margin: 0; }
    .footer a { color: #6d28d9; text-decoration: none; }
  </style>
</head>
<body>
  <div style="padding: 32px 16px;">
    <div class="wrapper">
      <div class="header">
        <h1>Sofia IA</h1>
        <p>Plataforma de Orquestracao de Agentes IA</p>
      </div>
      <div class="body">
        <h2>Ola, ${userName}!</h2>
        <p>
          Bem-vindo a Sofia IA. Sua conta esta pronta e voce ja pode comecar a criar agentes
          inteligentes e orquestracoes poderosas.
        </p>

        <h2 style="margin-top: 24px;">Primeiros passos</h2>

        <div class="step">
          <div class="step-num">1</div>
          <div class="step-text">
            <h3>Crie seu primeiro agente</h3>
            <p>Defina o nome, instrucoes e modelo de IA. Templates prontos para marketing, suporte e pesquisa.</p>
          </div>
        </div>

        <div class="step">
          <div class="step-num">2</div>
          <div class="step-text">
            <h3>Monte uma orquestracao</h3>
            <p>Conecte varios agentes em um pipeline sequencial para tarefas complexas.</p>
          </div>
        </div>

        <div class="step">
          <div class="step-num">3</div>
          <div class="step-text">
            <h3>Adicione uma base de conhecimento</h3>
            <p>Faca upload de PDFs, documentos e URLs para enriquecer seus agentes com RAG.</p>
          </div>
        </div>

        <div class="step">
          <div class="step-num">4</div>
          <div class="step-text">
            <h3>Integre com seus canais</h3>
            <p>WhatsApp, Web Chat e mais. Seus agentes atendem 24/7.</p>
          </div>
        </div>

        <div class="cta">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sofiaia.roilabs.com.br'}/dashboard">
            Acessar o Dashboard
          </a>
        </div>
      </div>
      <div class="footer">
        <p>
          Sofia IA - ROI Labs |
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sofiaia.roilabs.com.br'}">sofiaia.roilabs.com.br</a>
        </p>
        <p style="margin-top: 8px;">Se voce nao se cadastrou, ignore este email.</p>
      </div>
    </div>
  </div>
</body>
</html>`
}

/**
 * Send welcome email to a new user.
 */
export async function sendWelcomeEmail(userEmail: string, userName: string) {
  return sendEmail({
    to: userEmail,
    subject: `Bem-vindo a Sofia IA, ${userName.split(' ')[0]}!`,
    html: buildWelcomeEmail(userName),
  })
}
