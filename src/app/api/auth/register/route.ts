import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken, setAuthCookie } from '@/lib/auth'
import { sendWelcomeEmail } from '@/lib/email'
import { trackEvent, Events } from '@/lib/analytics'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, referredBy } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'A senha deve ter pelo menos 8 caracteres' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Email inválido' },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Este email já está em uso' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'user',
        status: 'active',
        ...(referredBy && { referredBy }),
      },
    })

    // Start Trial Pro for 7 days
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 7)
    await prisma.subscription.create({
      data: { userId: user.id, plan: 'pro', status: 'trialing', trialEndsAt },
    })

    const payload = { id: user.id, email: user.email, name: user.name, role: user.role }
    const token = await signToken(payload)
    await setAuthCookie(token)

    // Fire-and-forget: welcome email + analytics (never block the response)
    sendWelcomeEmail(user.email, user.name).catch(() => {})
    trackEvent(Events.SIGNUP, user.id, { method: 'email' }).catch(() => {})

    return NextResponse.json(
      { success: true, data: { token, user: payload, expires_in: '24h' } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
