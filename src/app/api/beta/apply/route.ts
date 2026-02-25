import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/beta/apply — salva candidatura ao programa beta
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, email, company, useCase, plan } = body

  if (!name || !email || !useCase) {
    return NextResponse.json(
      { error: 'name, email e useCase são obrigatórios' },
      { status: 400 }
    )
  }

  // Validar email básico
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }

  try {
    // Verificar se já existe candidatura para esse email
    const existing = await prisma.betaApplication.findFirst({
      where: { email: email.toLowerCase() },
    })

    if (existing) {
      if (existing.status === 'approved') {
        return NextResponse.json(
          { error: 'Este email já foi aprovado no programa beta. Verifique sua caixa de entrada.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Já existe uma candidatura para este email. Aguarde nossa resposta.' },
        { status: 409 }
      )
    }

    const application = await prisma.betaApplication.create({
      data: {
        name,
        email: email.toLowerCase(),
        company: company || null,
        useCase,
        plan: plan || 'pro',
        status: 'pending',
      },
    })

    // Enviar email de confirmação via Resend (opcional, não bloqueia)
    try {
      const resendApiKey = process.env.RESEND_API_KEY
      if (resendApiKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Sofia AI <noreply@sofiaia.roilabs.com.br>',
            to: [email],
            subject: 'Candidatura ao Beta da Sofia AI recebida!',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <h1 style="color: #6366f1;">Candidatura Recebida!</h1>
                <p>Olá <strong>${name}</strong>,</p>
                <p>Recebemos sua candidatura ao programa beta da Sofia AI. Obrigado pelo interesse!</p>
                <p>Nossa equipe vai analisar sua candidatura e entrar em contato em até <strong>48 horas</strong>.</p>
                <p>Enquanto isso, você pode:</p>
                <ul>
                  <li>Entrar no nosso <a href="https://discord.gg/sofiaia">Discord</a> para acompanhar novidades</li>
                  <li>Explorar a <a href="https://sofiaia.roilabs.com.br">plataforma</a> com o plano gratuito</li>
                </ul>
                <p style="color: #6b7280; font-size: 14px;">
                  Protocolo: ${application.id} | Plano solicitado: ${plan || 'Pro'}
                </p>
                <p>Até logo,<br/>Time Sofia AI</p>
              </div>
            `,
          }),
        })
      }
    } catch (emailError) {
      console.error('[beta/apply] Email send failed:', emailError)
      // Não falhar a request por erro de email
    }

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      message: 'Candidatura enviada com sucesso! Responderemos em até 48 horas.',
    })
  } catch (error) {
    console.error('[beta/apply]', error)
    return NextResponse.json({ error: 'Erro ao salvar candidatura' }, { status: 500 })
  }
}
