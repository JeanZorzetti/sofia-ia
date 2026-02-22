/**
 * Newsletter Subscribe API
 * POST /api/newsletter/subscribe — public endpoint
 * Body: { email, name?, source? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function buildNewsletterConfirmationEmail(name?: string): string {
  const displayName = name?.split(' ')[0] || 'amigo(a)'
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bem-vindo a Newsletter da Sofia AI</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="padding:32px 16px;">
    <div style="max-width:560px;margin:0 auto;background:#1e293b;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#6d28d9 0%,#3b82f6 100%);padding:32px;text-align:center;">
        <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 8px;">Sofia AI</h1>
        <p style="color:rgba(255,255,255,0.8);font-size:15px;margin:0;">Newsletter de IA e Automacao</p>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#f1f5f9;font-size:20px;margin:0 0 12px;">Ola, ${displayName}!</h2>
        <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 16px;">
          Voce agora faz parte da newsletter da Sofia AI. Toda semana voce recebe:
        </p>
        <ul style="color:#94a3b8;font-size:14px;line-height:1.8;padding-left:20px;margin:0 0 24px;">
          <li>Novidades sobre IA e automacao</li>
          <li>Templates de orquestracao prontos para usar</li>
          <li>Casos de uso e resultados reais</li>
          <li>Tutoriais e guias praticos</li>
        </ul>
        <div style="text-align:center;margin:24px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sofiaia.roilabs.com.br'}/login"
             style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#3b82f6);color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:8px;">
            Comecar a usar Sofia AI gratis
          </a>
        </div>
      </div>
      <div style="padding:20px 32px;border-top:1px solid #334155;text-align:center;">
        <p style="color:#475569;font-size:12px;margin:0;">
          Sofia AI - ROI Labs |
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sofiaia.roilabs.com.br'}" style="color:#6d28d9;text-decoration:none;">sofiaia.roilabs.com.br</a>
        </p>
        <p style="color:#374151;font-size:11px;margin:8px 0 0;">
          Voce se inscreveu em sofiaia.roilabs.com.br. Para cancelar, responda com "cancelar".
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  let body: { email?: string; name?: string; source?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email, name, source } = body

  // Validate
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }
  const cleanEmail = email.trim().toLowerCase()
  if (!isValidEmail(cleanEmail)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  try {
    // Upsert subscriber
    await prisma.newsletterSubscriber.upsert({
      where: { email: cleanEmail },
      create: {
        email: cleanEmail,
        name: name?.trim() || null,
        source: source || 'unknown',
        confirmed: true, // auto-confirm (simplified flow)
      },
      update: {
        name: name?.trim() || undefined,
        source: source || undefined,
        confirmed: true,
      },
    })

    // Send confirmation email (non-blocking)
    sendEmail({
      to: cleanEmail,
      subject: 'Bem-vindo a newsletter da Sofia AI!',
      html: buildNewsletterConfirmationEmail(name),
    }).catch((err) => console.error('[Newsletter] Email error:', err))

    return NextResponse.json(
      { success: true, message: 'Inscricao realizada com sucesso!' },
      { status: 201 }
    )
  } catch (err) {
    console.error('[Newsletter] Subscribe error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
