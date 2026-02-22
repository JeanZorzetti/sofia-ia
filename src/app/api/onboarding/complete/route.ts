import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendWelcomeEmail } from '@/lib/email'
import { trackEvent } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

/**
 * POST /api/onboarding/complete
 * Marks the user's onboarding as complete and sends a welcome email.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { useCase } = body as { useCase?: string }

    // 1. Mark onboarding as complete in DB
    const dbUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        onboardingCompleted: true,
        onboardingData: { useCase: useCase || 'other', completedAt: new Date().toISOString() },
      },
      select: { email: true, name: true },
    })

    // 2. Ensure free subscription exists
    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        plan: 'free',
        status: 'active',
      },
    })

    // 3. Send welcome email (fire and forget — do not block response)
    sendWelcomeEmail(dbUser.email, dbUser.name).catch((err) =>
      console.error('[onboarding/complete] Failed to send welcome email:', err)
    )

    // 4. Track onboarding complete event (fire and forget)
    trackEvent('onboarding_complete', user.id, { useCase: useCase || 'other' }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[onboarding/complete]', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
