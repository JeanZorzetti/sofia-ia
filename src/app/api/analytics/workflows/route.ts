import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    const workflowMetrics = await Promise.all(
      flows.map(async (flow) => {
        const executions = await prisma.flowExecution.count({
          where: {
            flowId: flow.id,
            startedAt: { gte: startDate, lte: endDate },
          },
        });

        const successExecutions = await prisma.flowExecution.count({
          where: {
            flowId: flow.id,
            status: 'success',
            startedAt: { gte: startDate, lte: endDate },
          },
        });

        const failedExecutions = await prisma.flowExecution.count({
          where: {
            flowId: flow.id,
            status: 'failed',
            startedAt: { gte: startDate, lte: endDate },
          },
        });

        const pendingExecutions = await prisma.flowExecution.count({
          where: {
            flowId: flow.id,
            status: 'pending',
            startedAt: { gte: startDate, lte: endDate },
          },
        });

        const successRate = executions > 0 ? (successExecutions / executions) * 100 : 0;
        const failureRate = executions > 0 ? (failedExecutions / executions) * 100 : 0;

        const executionDurations = await prisma.flowExecution.findMany({
          where: {
            flowId: flow.id,
            status: 'success',
            startedAt: { gte: startDate, lte: endDate },
            duration: { not: null },
          },
          select: { duration: true },
        });

        const avgDuration = executionDurations.length > 0
          ? executionDurations.reduce((sum, exec) => sum + (exec.duration || 0), 0) / executionDurations.length
          : 0;

        const lastExecution = await prisma.flowExecution.findFirst({
          where: { flowId: flow.id },
          orderBy: { startedAt: 'desc' },
          select: { startedAt: true, status: true },
        });

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
            successRate: Math.round(successRate * 100) / 100,
            failureRate: Math.round(failureRate * 100) / 100,
            avgDuration: Math.round(avgDuration),
            lastExecution: lastExecution ? {
              startedAt: lastExecution.startedAt.toISOString(),
              status: lastExecution.status,
            } : null,
          },
        };
      })
    );

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

    const overallSuccessRate = totals.executions > 0 ? (totals.successExecutions / totals.executions) * 100 : 0;
    const overallFailureRate = totals.executions > 0 ? (totals.failedExecutions / totals.executions) * 100 : 0;

    return NextResponse.json({
      success: true,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        label: period || '7d',
      },
      totals: {
        ...totals,
        successRate: Math.round(overallSuccessRate * 100) / 100,
        failureRate: Math.round(overallFailureRate * 100) / 100,
      },
      workflows: workflowMetrics,
    });
  } catch (error) {
    console.error('Error fetching workflow analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
