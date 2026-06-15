import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startTeamRun } from '@/lib/orchestration/team/start-team-run'
import { getNextRunAt } from '@/lib/orchestration/team/schedule'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const CRON_SECRET = process.env.CRON_SECRET || 'sofia-cron-secret-2026'

/**
 * GET /api/cron/run-scheduled-teams
 * Hit by cron-job.org. Protected by Authorization: Bearer {CRON_SECRET}.
 * Finds due ScheduledTeamRun rows, dispatches each via startTeamRun(), and advances nextRunAt.
 * lastStatus reflects DISPATCH ('dispatched'|'failed'), not the run's final outcome —
 * follow lastRunId to the TeamRun for the real status.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    console.warn('[cron/run-scheduled-teams] Unauthorized attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results: Array<{ scheduleId: string; status: string; runId?: string; error?: string }> = []

  try {
    const due = await prisma.scheduledTeamRun.findMany({
      where: { isActive: true, nextRunAt: { lte: now } },
      take: 50,
    })
    console.log(`[cron/run-scheduled-teams] Found ${due.length} due at ${now.toISOString()}`)

    for (const s of due) {
      const nextRunAt = getNextRunAt(s.cronExpr, now)
      try {
        const { runId } = await startTeamRun(s.teamId, {
          mission: s.mission,
          mode: s.mode === 'code' ? 'code' : 'chat',
          userId: s.userId,
        })
        await prisma.scheduledTeamRun.update({
          where: { id: s.id },
          data: { lastRunAt: now, lastStatus: 'dispatched', lastRunId: runId, nextRunAt },
        })
        results.push({ scheduleId: s.id, status: 'dispatched', runId })
        console.log(`[cron/run-scheduled-teams] ${s.id} dispatched run ${runId}. Next: ${nextRunAt.toISOString()}`)
      } catch (err: any) {
        await prisma.scheduledTeamRun.update({
          where: { id: s.id },
          data: { lastRunAt: now, lastStatus: 'failed', nextRunAt },
        }).catch(() => {})
        results.push({ scheduleId: s.id, status: 'failed', error: err?.message })
        console.error(`[cron/run-scheduled-teams] ${s.id} failed:`, err)
      }
    }

    return NextResponse.json({ processed: due.length, results, timestamp: now.toISOString() })
  } catch (error: any) {
    console.error('[cron/run-scheduled-teams] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
