import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/analytics
 * Returns product analytics data for the admin dashboard.
 * Protected: only accessible by the admin user (ADMIN_USER_ID env var).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // ── Signups per day (last 30 days) ─────────────────────────
    const signupsRaw = await prisma.analyticsEvent.findMany({
      where: {
        event: 'signup',
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    // Group by date
    const signupsByDay: Record<string, number> = {}
    signupsRaw.forEach((e) => {
      const day = e.createdAt.toISOString().split('T')[0]
      signupsByDay[day] = (signupsByDay[day] || 0) + 1
    })
    const signupsPerDay = Object.entries(signupsByDay).map(([date, count]) => ({ date, count }))

    // ── Conversion funnel ──────────────────────────────────────
    const [
      totalSignups,
      totalFirstAgent,
      totalFirstOrchestration,
      totalFirstExecution,
      totalPaid,
    ] = await Promise.all([
      prisma.analyticsEvent.count({ where: { event: 'signup' } }),
      prisma.analyticsEvent.count({ where: { event: 'first_agent_created' } }),
      prisma.analyticsEvent.count({ where: { event: 'first_orchestration_created' } }),
      prisma.analyticsEvent.count({ where: { event: 'first_orchestration_executed' } }),
      prisma.analyticsEvent.count({ where: { event: 'plan_upgrade_completed' } }),
    ])

    const funnel = [
      { step: 'signup', label: 'Cadastro', count: totalSignups },
      { step: 'first_agent_created', label: 'Primeiro Agente', count: totalFirstAgent },
      { step: 'first_orchestration_created', label: 'Primeira Orquestração', count: totalFirstOrchestration },
      { step: 'first_orchestration_executed', label: 'Primeira Execução', count: totalFirstExecution },
      { step: 'plan_upgrade_completed', label: 'Upgrade para Pago', count: totalPaid },
    ].map((step, i, arr) => ({
      ...step,
      pct: i === 0 ? 100 : arr[0].count > 0 ? Math.round((step.count / arr[0].count) * 100) : 0,
    }))

    // ── Plan distribution ──────────────────────────────────────
    const planGroups = await prisma.subscription.groupBy({
      by: ['plan'],
      _count: { plan: true },
    })
    const planDistribution = planGroups.map((g) => ({
      plan: g.plan,
      count: g._count.plan,
    }))

    // ── Events last 7 days (grouped by event + day) ────────────
    const recentEvents = await prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { event: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    const eventsByDay: Record<string, Record<string, number>> = {}
    recentEvents.forEach((e) => {
      const day = e.createdAt.toISOString().split('T')[0]
      if (!eventsByDay[day]) eventsByDay[day] = {}
      eventsByDay[day][e.event] = (eventsByDay[day][e.event] || 0) + 1
    })
    const eventsTimeline = Object.entries(eventsByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, events]) => ({ date, events }))

    // ── NPS stats ──────────────────────────────────────────────
    const npsEntries = await prisma.npsFeedback.findMany({
      select: { score: true },
    })

    let npsScore: number | null = null
    if (npsEntries.length > 0) {
      const promoters = npsEntries.filter((n) => n.score >= 9).length
      const detractors = npsEntries.filter((n) => n.score <= 6).length
      npsScore = Math.round(((promoters - detractors) / npsEntries.length) * 100)
    }

    return NextResponse.json({
      success: true,
      data: {
        signupsPerDay,
        funnel,
        planDistribution,
        eventsTimeline,
        nps: {
          score: npsScore,
          totalResponses: npsEntries.length,
        },
      },
    })
  } catch (error) {
    console.error('[admin/analytics]', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
