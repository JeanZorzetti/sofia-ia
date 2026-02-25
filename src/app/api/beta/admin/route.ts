import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/beta/admin — lista candidaturas (admin only)
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Verificar se é admin
  const user = await prisma.user.findUnique({ where: { id: auth.id }, select: { role: true } })
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20
  const skip = (page - 1) * limit

  const where = status ? { status } : {}

  const [applications, total] = await Promise.all([
    prisma.betaApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.betaApplication.count({ where }),
  ])

  return NextResponse.json({ applications, total, page, pages: Math.ceil(total / limit) })
}

// PATCH /api/beta/admin — aprovar ou rejeitar candidatura
export async function PATCH(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: auth.id }, select: { role: true } })
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const body = await request.json()
  const { applicationId, action } = body // action: 'approve' | 'reject'

  if (!applicationId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'applicationId e action (approve|reject) são obrigatórios' }, { status: 400 })
  }

  const application = await prisma.betaApplication.findUnique({ where: { id: applicationId } })
  if (!application) {
    return NextResponse.json({ error: 'Candidatura não encontrada' }, { status: 404 })
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected'
  await prisma.betaApplication.update({ where: { id: applicationId }, data: { status: newStatus } })

  // Se aprovado, marcar usuário como beta tester (se existir conta)
  if (action === 'approve') {
    const existingUser = await prisma.user.findFirst({
      where: { email: application.email },
    })
    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { isBetaTester: true },
      })
    }

    // Enviar email de aprovação
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
            to: [application.email],
            subject: 'Parabens! Voce foi aprovado no Beta da Sofia AI',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <h1 style="color: #6366f1;">Voce foi aprovado!</h1>
                <p>Ola <strong>${application.name}</strong>,</p>
                <p>Temos otimas noticias: sua candidatura ao programa beta da Sofia AI foi <strong>aprovada</strong>!</p>
                <p>Como beta tester, voce tem acesso a:</p>
                <ul>
                  <li>Plataforma completa em <a href="https://sofiaia.roilabs.com.br">sofiaia.roilabs.com.br</a></li>
                  <li>Canal privado #beta no <a href="https://discord.gg/sofiaia">Discord</a></li>
                  <li>Badge exclusiva "Beta Tester" no seu perfil</li>
                </ul>
                <p>
                  <a href="https://sofiaia.roilabs.com.br/cadastro" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                    Comecar Agora
                  </a>
                </p>
                <p>Bem-vindo ao time,<br/>Time Sofia AI</p>
              </div>
            `,
          }),
        })
      }
    } catch (emailError) {
      console.error('[beta/admin approve] Email failed:', emailError)
    }
  }

  return NextResponse.json({ success: true, status: newStatus })
}
