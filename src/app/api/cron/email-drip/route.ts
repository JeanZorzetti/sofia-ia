/**
 * Cron: Email Drip Sequence
 * Runs daily at 09:00 BRT (12:00 UTC).
 *
 * Drip schedule (days since signup):
 *   D+1  → "Crie seu primeiro agente"
 *   D+3  → "Experimente o Magic Create"
 *   D+5  → "3 templates prontos"
 *   D+7  → NPS inline survey
 *   D+14 → Upgrade offer (trial expired)
 *   D+30 → Re-engagement (inactive users)
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
  sendDrip14Email,
  sendDrip30Email,
} from '@/lib/email'
import { trackEvent } from '@/lib/analytics'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type DripEvent = 'drip_d1_sent' | 'drip_d3_sent' | 'drip_d5_sent' | 'drip_d14_sent' | 'drip_d30_sent'

const DRIP_SEQUENCE: { daysAfter: number; event: DripEvent; send: (email: string, name: string) => Promise<unknown> }[] = [
  { daysAfter: 1,  event: 'drip_d1_sent',  send: sendDrip1Email },
  { daysAfter: 3,  event: 'drip_d3_sent',  send: sendDrip3Email },
  { daysAfter: 5,  event: 'drip_d5_sent',  send: sendDrip5Email },
  { daysAfter: 14, event: 'drip_d14_sent', send: sendDrip14Email },
  { daysAfter: 30, event: 'drip_d30_sent', send: sendDrip30Email },
]

async function alreadySent(userId: string, event: string): Promise<boolean> {
  const count = await prisma.analyticsEvent.count({ where: { userId, event } })
  return count > 0
}

export async function GET(req: NextRequest) {
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
    take: 500,
  })

  for (const user of users) {
    const daysSinceSignup = Math.floor(
      (now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Standard drip sequence
    for (const drip of DRIP_SEQUENCE) {
      if (daysSinceSignup !== drip.daysAfter) continue
      if (await alreadySent(user.id, drip.event)) { skipped++; continue }
      await drip.send(user.email, user.name)
      await trackEvent(drip.event, user.id)
      sent++
    }

    // D+7 NPS (needs userId in links)
    if (daysSinceSignup === 7) {
      if (!(await alreadySent(user.id, 'drip_d7_sent'))) {
        await sendDrip7Email(user.email, user.name, user.id)
        await trackEvent('drip_d7_sent', user.id)
        sent++
      } else {
        skipped++
      }
    }
  }

  return NextResponse.json({ success: true, processed: users.length, sent, skipped, runAt: now.toISOString() })
}
