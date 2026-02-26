/**
 * Cron: Email Drip Sequence
 * Runs daily at 09:00 BRT (12:00 UTC).
 *
 * For each active user, fires the right drip email based on days since signup:
 *   D+1 → "Crie seu primeiro agente"
 *   D+3 → "Experimente o Magic Create"
 *   D+5 → "3 templates prontos"
 *   D+7 → NPS inline survey
 *
 * Tracks sent emails via AnalyticsEvent to avoid duplicates.
 * Protected by CRON_SECRET header.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  sendDrip1Email,
  sendDrip3Email,
  sendDrip5Email,
  sendDrip7Email,
} from '@/lib/email'
import { trackEvent } from '@/lib/analytics'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Days → drip config
const DRIP_SEQUENCE = [
  { daysAfter: 1, event: 'drip_d1_sent' as const, send: sendDrip1Email },
  { daysAfter: 3, event: 'drip_d3_sent' as const, send: sendDrip3Email },
  { daysAfter: 5, event: 'drip_d5_sent' as const, send: sendDrip5Email },
] as const

export async function GET(req: NextRequest) {
  // Protect with CRON_SECRET
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  let sent = 0
  let skipped = 0

  const users = await prisma.user.findMany({
    where: { status: 'active' },
    select: { id: true, email: true, name: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 500, // safety cap
  })

  for (const user of users) {
    const daysSinceSignup = Math.floor(
      (now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Standard drip sequence (D+1, D+3, D+5)
    for (const drip of DRIP_SEQUENCE) {
      if (daysSinceSignup !== drip.daysAfter) continue

      // Check if already sent
      const alreadySent = await prisma.analyticsEvent.count({
        where: { userId: user.id, event: drip.event },
      })
      if (alreadySent > 0) { skipped++; continue }

      await drip.send(user.email, user.name)
      await trackEvent(drip.event, user.id)
      sent++
    }

    // D+7 NPS (special case: includes userId in email links)
    if (daysSinceSignup === 7) {
      const alreadySent = await prisma.analyticsEvent.count({
        where: { userId: user.id, event: 'drip_d7_sent' },
      })
      if (alreadySent === 0) {
        await sendDrip7Email(user.email, user.name, user.id)
        await trackEvent('drip_d7_sent' as Parameters<typeof trackEvent>[0], user.id)
        sent++
      } else {
        skipped++
      }
    }
  }

  return NextResponse.json({
    success: true,
    processed: users.length,
    sent,
    skipped,
    runAt: now.toISOString(),
  })
}
