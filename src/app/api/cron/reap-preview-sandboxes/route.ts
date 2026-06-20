// src/app/api/cron/reap-preview-sandboxes/route.ts
// Hit by cron-job.org (~every 5 min). Protected by Authorization: Bearer {CRON_SECRET}.
// Kills E2B sandboxes whose preview TTL has elapsed and marks the run 'expired'. The
// sandbox's own setTimeout is the hard cost ceiling; this just makes expiry prompt and
// keeps the DB state honest. Lazy-expiry in GET .../preview is the per-request backstop.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { safeErrorMessage } from '@/lib/api-response'
import { verifyCronAuth } from '@/lib/authz'
import { killPreviewSandbox } from '@/lib/orchestration/team/preview-lifecycle'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    console.warn('[cron/reap-preview-sandboxes] Unauthorized attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results: Array<{ runId: string; status: string }> = []

  try {
    const expired = await prisma.teamRun.findMany({
      where: { previewStatus: 'live', previewExpiresAt: { lt: now } },
      select: { id: true, sandboxId: true },
      take: 50,
    })
    console.log(`[cron/reap-preview-sandboxes] Found ${expired.length} expired at ${now.toISOString()}`)

    for (const run of expired) {
      await killPreviewSandbox(run.sandboxId)
      await prisma.teamRun
        .update({ where: { id: run.id }, data: { previewStatus: 'expired', previewUrl: null } })
        .catch(() => {})
      results.push({ runId: run.id, status: 'expired' })
    }

    return NextResponse.json({ processed: expired.length, results, timestamp: now.toISOString() })
  } catch (error) {
    console.error('[cron/reap-preview-sandboxes] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error', details: safeErrorMessage(error) }, { status: 500 })
  }
}
