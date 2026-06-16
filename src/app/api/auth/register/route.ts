import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken, setAuthCookie } from '@/lib/auth'
import { sendWelcomeEmail } from '@/lib/email'
import { trackEvent, Events } from '@/lib/analytics'
import { parseJson, registerSchema } from '@/lib/validation'

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseJson(req, registerSchema)
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, error: parsed.error },
        { status: 400 }
      )
    }
    const { name, email, password, referredBy } = parsed.data

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
