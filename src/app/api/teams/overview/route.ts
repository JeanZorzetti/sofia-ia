import { NextRequest, NextResponse } from 'next/server';
import { withAll } from '@/lib/api-middleware';
import { rateLimiters } from '@/lib/rate-limit';
import { TTL } from '@/lib/cache';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

interface PeriodFilter {
  startDate: Date;
  endDate: Date;
}

function parsePeriod(period: string | null, startDate?: string, endDate?: string): PeriodFilter {
  const now = new Date();
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  if (period === 'custom' && startDate && endDate) {
    return {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    };
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case '7d':
      start.setDate(now.getDate() - 7);
      break;
    case '30d':
      start.setDate(now.getDate() - 30);
      break;
    case '90d':
      start.setDate(now.getDate() - 90);
      break;
    case 'today':
      // Already set to today
      break;
    default:
      start.setDate(now.getDate() - 7);
  }

  return { startDate: start, endDate: end };
}

async function handler(request: NextRequest): Promise<NextResponse> {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get('period');
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  const { startDate, endDate } = parsePeriod(
    period,
    startDateParam || undefined,
    endDateParam || undefined
  );

  // Active teams count (inventory — not period-sensitive)
  const teams = await prisma.team.count({
    where: { createdBy: auth.id, status: 'active' },
  });

  // Runs in period scoped by team ownership
  const runs = await prisma.teamRun.findMany({
    where: {
      team: { createdBy: auth.id },
      startedAt: { gte: startDate, lte: endDate },
    },
    include: {
      team: { select: { name: true } },
    },
    orderBy: { startedAt: 'desc' },
  });

  const runIds = runs.map(r => r.id);

  // Done tasks for those runs (for count + timeline grouping)
  const doneTasks = runIds.length > 0
    ? await prisma.teamTask.findMany({
        where: { runId: { in: runIds }, status: 'done' },
        select: { runId: true },
      })
    : [];

  // Overview metrics
  const runsTotal = runs.length;
  const runsCompleted = runs.filter(r => r.status === 'completed').length;
  const runsFailed = runs.filter(r => r.status === 'failed').length;
  const runsRunning = runs.filter(r => r.status === 'pending' || r.status === 'running').length;

  const finalized = runs.filter(r =>
    r.status === 'completed' ||
    r.status === 'failed' ||
    r.status === 'rate_limited' ||
    r.status === 'cancelled'
  ).length;
  const successRate = finalized > 0
    ? Math.round((runsCompleted / finalized) * 10000) / 100
    : 0;

  const tasksExecuted = doneTasks.length;

  const runsWithDuration = runs.filter(r => r.durationMs != null);
  const avgDurationMs = runsWithDuration.length > 0
    ? Math.round(
        runsWithDuration.reduce((sum, r) => sum + (r.durationMs ?? 0), 0) /
        runsWithDuration.length
      )
    : 0;

  const totalTokens = runs.reduce((sum, r) => sum + (r.tokensUsed ?? 0), 0);
  const totalCost = runs.reduce((sum, r) => sum + Number(r.estimatedCost ?? 0), 0);

  // Recent runs — last 8, already ordered desc
  const recentRuns = runs.slice(0, 8).map(r => ({
    id: r.id,
    teamId: r.teamId,
    teamName: r.team.name,
    status: r.status,
    startedAt: r.startedAt.toISOString(),
    durationMs: r.durationMs,
  }));

  // Timeline — group runs and done tasks by day (startedAt date of their run)
  const runIdToDate = new Map<string, string>(
    runs.map(r => [r.id, r.startedAt.toISOString().split('T')[0]])
  );

  const timelineMap = new Map<string, { runs: number; tasks: number; cost: number }>();
  for (const run of runs) {
    const date = run.startedAt.toISOString().split('T')[0];
    const entry = timelineMap.get(date) ?? { runs: 0, tasks: 0, cost: 0 };
    entry.runs += 1;
    entry.cost += Number(run.estimatedCost ?? 0);
    timelineMap.set(date, entry);
  }
  for (const task of doneTasks) {
    const date = runIdToDate.get(task.runId);
    if (date) {
      const entry = timelineMap.get(date);
      if (entry) entry.tasks += 1;
    }
  }

  const timeline = Array.from(timelineMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));

  return NextResponse.json({
    success: true,
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      label: period || '7d',
    },
    overview: {
      teams,
      runsTotal,
      runsCompleted,
      runsFailed,
      runsRunning,
      successRate,
      tasksExecuted,
      avgDurationMs,
      totalTokens,
      totalCost,
    },
    recentRuns,
    timeline,
    byMember: [],
  });
}

export const GET = withAll(handler, {
  ttl: TTL.MEDIUM,
  limiter: rateLimiters.analytics,
});
