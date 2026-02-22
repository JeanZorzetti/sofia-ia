import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { getUsageSummary } from '@/lib/plan-limits'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/billing
 * Returns the current user's subscription and usage summary.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const summary = await getUsageSummary(user.id)

    // Fetch billing history (last 10 paid billings from subscription log)
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    })

    return NextResponse.json({
      success: true,
      data: {
        summary,
        subscription,
      },
    })
  } catch (error) {
    console.error('[billing GET]', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
