// 008-team-run-resilience — GET /api/cron/resume-blocked-teams
// Varredura periódica (cron-job.org, Bearer CRON_SECRET): retoma TeamRuns esgotados
// (rate_limited) cujo reset já passou. Espelha api/cron/resume-blocked-companies (007).
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { safeErrorMessage } from '@/lib/api-response'
import { verifyCronAuth } from '@/lib/authz'
import { resetRunForResume } from '@/lib/orchestration/team/team-resilience'
import { dispatchTeamRun } from '@/lib/orchestration/team/team-dispatch'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    console.warn('[cron/resume-blocked-teams] Unauthorized attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results: Array<{ runId: string; status: string }> = []

  try {
    const due = await prisma.teamRun.findMany({
      where: { status: 'rate_limited', resetAt: { not: null, lte: now } },
      take: 50,
      select: { id: true },
    })
    console.log(`[cron/resume-blocked-teams] ${due.length} due at ${now.toISOString()}`)

    for (const run of due) {
      const ok = await resetRunForResume(run.id) // atômico; pula se já retomado
      if (!ok) continue
      await dispatchTeamRun(run.id)
      results.push({ runId: run.id, status: 'resumed' })
    }

    return NextResponse.json({ processed: due.length, results, timestamp: now.toISOString() })
  } catch (error) {
    console.error('[cron/resume-blocked-teams] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error', details: safeErrorMessage(error) }, { status: 500 })
  }
}
