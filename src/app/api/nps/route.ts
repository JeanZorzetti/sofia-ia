import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { trackEvent } from '@/lib/analytics'

/**
 * POST /api/nps
 * Submit an NPS feedback score.
 * Body: { score: number (0-10), comment?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    // Allow anonymous NPS submissions but track userId if authenticated
    const userId = auth?.id ?? null

    const body = await request.json()
    const { score, comment } = body as { score: unknown; comment?: unknown }

    // Validate score
    if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 10) {
      return NextResponse.json(
        { success: false, error: 'score deve ser um inteiro entre 0 e 10' },
        { status: 400 }
      )
    }

    await prisma.npsFeedback.create({
      data: {
        userId,
        score,
        comment: typeof comment === 'string' && comment.trim() ? comment.trim() : null,
      },
    })

    // Track NPS submission event (fire and forget)
    trackEvent('nps_submitted', userId ?? undefined, { score }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/nps]', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
