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

// ─── Drip Email Templates ─────────────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sofiaia.roilabs.com.br'

function emailShell(body: string): string {
  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>
  body{margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
  .w{max-width:600px;margin:0 auto;background:#1e293b;border-radius:12px;overflow:hidden;}
  .h{background:linear-gradient(135deg,#6d28d9,#3b82f6);padding:28px 32px;text-align:center;}
  .h h1{color:#fff;font-size:22px;font-weight:700;margin:0;}
  .b{padding:28px 32px;}
  .b h2{color:#f1f5f9;font-size:18px;margin:0 0 10px;}
  .b p{color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 14px;}
  .cta{text-align:center;margin:24px 0 0;}
  .cta a{display:inline-block;background:linear-gradient(135deg,#6d28d9,#3b82f6);color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;}
  .ft{padding:20px 32px;text-align:center;border-top:1px solid #334155;}
  .ft p{color:#475569;font-size:12px;margin:0;}
  .ft a{color:#6d28d9;text-decoration:none;}
  .hl{background:#0f172a;border-left:3px solid #6d28d9;border-radius:6px;padding:14px 16px;margin:0 0 14px;}
  .hl h3{color:#e2e8f0;font-size:14px;font-weight:600;margin:0 0 4px;}
  .hl p{color:#94a3b8;font-size:13px;margin:0;}
</style></head><body>
<div style="padding:24px 16px;">
<div class="w">
<div class="h"><h1>Sofia IA</h1></div>
<div class="b">${body}</div>
<div class="ft"><p>Sofia IA · <a href="${APP_URL}">sofiaia.roilabs.com.br</a> · <a href="${APP_URL}/dashboard/settings">Cancelar emails</a></p></div>
</div></div></body></html>`
}

/** D+1 — "Crie seu primeiro agente" */
export function buildDrip1Email(firstName: string): string {
  return emailShell(`
<h2>Oi, ${firstName}! Seu agente espera por você</h2>
<p>Você se cadastrou ontem. O próximo passo leva menos de 2 minutos: criar seu primeiro agente de IA.</p>
<div class="hl">
  <h3>O que é um agente?</h3>
  <p>Uma IA com nome, instruções e personalidade definidos por você. Ele lembra do contexto, usa sua base de conhecimento e responde no tom que você configurar.</p>
</div>
<p>Temos templates prontos para: <strong>copywriter</strong>, <strong>pesquisador de mercado</strong>, <strong>suporte ao cliente</strong> e mais.</p>
<div class="cta"><a href="${APP_URL}/dashboard/agents">Criar meu primeiro agente →</a></div>
`)
}

/** D+3 — "Experimente o Magic Create" */
export function buildDrip3Email(firstName: string): string {
  return emailShell(`
<h2>${firstName}, experimente o Magic Create</h2>
<p>Sabia que você pode criar uma orquestração inteira só descrevendo o que quer fazer?</p>
<div class="hl">
  <h3>Magic Create</h3>
  <p>Digite algo como: <em>"Quero um pipeline que pesquisa tendências, escreve um post para LinkedIn e revisa o texto"</em> — e a Sofia monta tudo automaticamente.</p>
</div>
<p>Uma orquestração com 3 agentes em 30 segundos, sem configurar nada manualmente.</p>
<div class="cta"><a href="${APP_URL}/dashboard/orchestrations">Tentar o Magic Create →</a></div>
`)
}

/** D+7 — NPS inline */
export function buildDrip7Email(firstName: string, userId: string): string {
  const scores = [1,2,3,4,5,6,7,8,9,10].map(n =>
    `<a href="${APP_URL}/api/nps?score=${n}&uid=${userId}" style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#94a3b8;text-decoration:none;font-size:13px;font-weight:600;">${n}</a>`
  ).join('')

  return emailShell(`
<h2>Como está sendo sua experiência?</h2>
<p>Oi ${firstName}, você está há 7 dias na Sofia IA. Sua opinião importa muito para nós.</p>
<p><strong>De 0 a 10, qual a probabilidade de você recomendar a Sofia para um colega?</strong></p>
<div style="margin:20px 0;display:flex;gap:6px;flex-wrap:wrap;">${scores}</div>
<p style="font-size:12px;color:#64748b;">0 = jamais recomendaria · 10 = com certeza recomendaria</p>
<p>Se quiser dar um feedback mais detalhado, basta responder este email. Lemos tudo!</p>
`)
}

/** D+5 — "3 templates para explorar" */
export function buildDrip5Email(firstName: string): string {
  return emailShell(`
<h2>${firstName}, 3 templates prontos para usar hoje</h2>
<p>Muitos usuários chegam aqui sem saber por onde começar. Estes são os 3 templates mais usados:</p>
<div class="hl">
  <h3>1. Pipeline de Marketing</h3>
  <p>Pesquisador → Copywriter → Revisor. Gera posts para redes sociais em segundos.</p>
</div>
<div class="hl">
  <h3>2. Análise de Documentos</h3>
  <p>Faz upload de um PDF e responde perguntas sobre ele. Ideal para contratos e relatórios.</p>
</div>
<div class="hl">
  <h3>3. Suporte ao Cliente</h3>
  <p>Agente com base de conhecimento da sua empresa. Responde dúvidas 24/7.</p>
</div>
<div class="cta"><a href="${APP_URL}/dashboard/marketplace">Ver todos os templates →</a></div>
`)
}

// ─── Drip send helpers ────────────────────────────────────

export async function sendDrip1Email(userEmail: string, userName: string) {
  const firstName = userName.split(' ')[0]
  return sendEmail({
    to: userEmail,
    subject: `${firstName}, seu agente espera por você`,
    html: buildDrip1Email(firstName),
  })
}

export async function sendDrip3Email(userEmail: string, userName: string) {
  const firstName = userName.split(' ')[0]
  return sendEmail({
    to: userEmail,
    subject: `${firstName}, crie um pipeline inteiro em 30 segundos`,
    html: buildDrip3Email(firstName),
  })
}

export async function sendDrip5Email(userEmail: string, userName: string) {
  const firstName = userName.split(' ')[0]
  return sendEmail({
    to: userEmail,
    subject: `3 templates prontos para você testar hoje`,
    html: buildDrip5Email(firstName),
  })
}

export async function sendDrip7Email(userEmail: string, userName: string, userId: string) {
  const firstName = userName.split(' ')[0]
  return sendEmail({
    to: userEmail,
    subject: `Como está sendo sua experiência com a Sofia?`,
    html: buildDrip7Email(firstName, userId),
  })
}
