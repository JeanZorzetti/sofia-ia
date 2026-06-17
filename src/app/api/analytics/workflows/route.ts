import { NextRequest, NextResponse } from 'next/server';
import { safeErrorMessage } from '@/lib/api-response'
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { nestedCount, rate, round2 } from '@/lib/analytics/aggregate';

interface PeriodFilter {
  startDate: Date;
  endDate: Date;
}

function parsePeriod(period: string | null, startDate?: string, endDate?: string): PeriodFilter {
  const now = new Date();
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  if (period === 'custom' && startDate && endDate) {
    return { startDate: new Date(startDate), endDate: new Date(endDate) };
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case '7d': start.setDate(now.getDate() - 7); break;
    case '30d': start.setDate(now.getDate() - 30); break;
    case '90d': start.setDate(now.getDate() - 90); break;
    case 'today': break;
    default: start.setDate(now.getDate() - 7);
  }

  return { startDate: start, endDate: end };
}

/**
 * GET /api/analytics/workflows
 * Retorna métricas detalhadas por workflow (now using Flow model)
 *
 * Performance (Sprint 2): antes rodava 5 queries POR flow (N+1). Agora roda um
 * número fixo de queries em lote: contagens por status (`groupBy [flowId,status]`),
 * duração média (`groupBy _avg`) e última execução (`findMany distinct`).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const flowIdParam = searchParams.get('workflowId');

    const { startDate, endDate } = parsePeriod(period, startDateParam || undefined, endDateParam || undefined);

    const flows = await prisma.flow.findMany({
      where: flowIdParam ? { id: flowIdParam } : {},
      include: {
        creator: { select: { name: true, email: true } },
      },
    });

    const flowIds = flows.map((f) => f.id);

    if (flowIds.length === 0) {
      return NextResponse.json({
        success: true,
        period: { startDate: startDate.toISOString(), endDate: endDate.toISOString(), label: period || '7d' },
        totals: { executions: 0, successExecutions: 0, failedExecutions: 0, pendingExecutions: 0, successRate: 0, failureRate: 0 },
        workflows: [],
      });
    }

    // ---- Queries em lote ----
    const [statusGroups, avgGroups, lastExecutions] = await Promise.all([
      // Contagem por (flow, status) no período → executions/success/failed/pending
      prisma.flowExecution.groupBy({
        by: ['flowId', 'status'],
        where: { flowId: { in: flowIds }, startedAt: { gte: startDate, lte: endDate } },
        _count: { _all: true },
      }),
      // Duração média das execuções com sucesso no período
      prisma.flowExecution.groupBy({
        by: ['flowId'],
        where: {
          flowId: { in: flowIds },
          status: 'success',
          startedAt: { gte: startDate, lte: endDate },
          duration: { not: null },
        },
        _avg: { duration: true },
      }),
      // Última execução por flow (sem filtro de período) — uma linha por flow
      prisma.flowExecution.findMany({
        where: { flowId: { in: flowIds } },
        orderBy: { startedAt: 'desc' },
        distinct: ['flowId'],
        select: { flowId: true, startedAt: true, status: true },
      }),
    ]);

    const statusByFlow = nestedCount(statusGroups, 'flowId', 'status');
    const avgByFlow = new Map(avgGroups.map((g) => [g.flowId, g._avg.duration ?? 0]));
    const lastByFlow = new Map(
      lastExecutions.map((e) => [e.flowId, { startedAt: e.startedAt, status: e.status }])
    );

    const workflowMetrics = flows.map((flow) => {
      const counts = statusByFlow.get(flow.id);
      const executions = counts ? [...counts.values()].reduce((a, b) => a + b, 0) : 0;
      const successExecutions = counts?.get('success') ?? 0;
      const failedExecutions = counts?.get('failed') ?? 0;
      const pendingExecutions = counts?.get('pending') ?? 0;
      const avgDuration = avgByFlow.get(flow.id) ?? 0;
      const last = lastByFlow.get(flow.id);

      return {
        workflow: {
          id: flow.id,
          name: flow.name,
          description: flow.description,
          status: flow.status,
          triggerType: flow.triggerType,
          createdBy: flow.creator.name,
          lastRun: flow.lastRunAt?.toISOString() || null,
        },
        metrics: {
          executions,
          successExecutions,
          failedExecutions,
          pendingExecutions,
          successRate: round2(rate(successExecutions, executions)),
          failureRate: round2(rate(failedExecutions, executions)),
          avgDuration: Math.round(avgDuration),
          lastExecution: last
            ? { startedAt: last.startedAt.toISOString(), status: last.status }
            : null,
        },
      };
    });

    workflowMetrics.sort((a, b) => b.metrics.executions - a.metrics.executions);

    const totals = workflowMetrics.reduce(
      (acc, item) => ({
        executions: acc.executions + item.metrics.executions,
        successExecutions: acc.successExecutions + item.metrics.successExecutions,
        failedExecutions: acc.failedExecutions + item.metrics.failedExecutions,
        pendingExecutions: acc.pendingExecutions + item.metrics.pendingExecutions,
      }),
      { executions: 0, successExecutions: 0, failedExecutions: 0, pendingExecutions: 0 }
    );

    return NextResponse.json({
      success: true,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        label: period || '7d',
      },
      totals: {
        ...totals,
        successRate: round2(rate(totals.successExecutions, totals.executions)),
        failureRate: round2(rate(totals.failedExecutions, totals.executions)),
      },
      workflows: workflowMetrics,
    });
  } catch (error) {
    console.error('Error fetching workflow analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: safeErrorMessage(error, 'Unknown error') },
      { status: 500 }
    );
  }
}
