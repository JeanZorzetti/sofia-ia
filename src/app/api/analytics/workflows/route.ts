import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface PeriodFilter {
  startDate: Date;
  endDate: Date;
}

/**
 * Parse período do query param
 */
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
      break;
    default:
      start.setDate(now.getDate() - 7);
  }

  return { startDate: start, endDate: end };
}

/**
 * GET /api/analytics/workflows
 *
 * Retorna métricas detalhadas por workflow
 *
 * Query params:
 * - period: 7d | 30d | 90d | today | custom (default: 7d)
 * - startDate: data início no formato YYYY-MM-DD (para period=custom)
 * - endDate: data fim no formato YYYY-MM-DD (para period=custom)
 * - workflowId: filtrar por workflow específico (opcional)
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
    const workflowIdParam = searchParams.get('workflowId');

    const { startDate, endDate } = parsePeriod(period, startDateParam || undefined, endDateParam || undefined);

    // Buscar todos os workflows
    const workflows = await prisma.workflow.findMany({
      where: workflowIdParam ? { id: workflowIdParam } : {},
      include: {
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Para cada workflow, calcular métricas no período
    const workflowMetrics = await Promise.all(
      workflows.map(async (workflow) => {
        // Execuções no período
        const executions = await prisma.workflowExecution.count({
          where: {
            workflowId: workflow.id,
            startedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        // Execuções bem-sucedidas
        const successExecutions = await prisma.workflowExecution.count({
          where: {
            workflowId: workflow.id,
            status: 'success',
            startedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        // Execuções com erro
        const failedExecutions = await prisma.workflowExecution.count({
          where: {
            workflowId: workflow.id,
            status: 'error',
            startedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        // Execuções pendentes
        const pendingExecutions = await prisma.workflowExecution.count({
          where: {
            workflowId: workflow.id,
            status: 'pending',
            startedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        // Taxa de sucesso
        const successRate = executions > 0
          ? (successExecutions / executions) * 100
          : 0;

        // Taxa de erro
        const failureRate = executions > 0
          ? (failedExecutions / executions) * 100
          : 0;

        // Duração média das execuções
        const executionDurations = await prisma.workflowExecution.findMany({
          where: {
            workflowId: workflow.id,
            status: 'success',
            startedAt: {
              gte: startDate,
              lte: endDate,
            },
            duration: {
              not: null,
            },
          },
          select: {
            duration: true,
          },
        });

        const avgDuration = executionDurations.length > 0
          ? executionDurations.reduce((sum, exec) => sum + (exec.duration || 0), 0) / executionDurations.length
          : 0;

        // Última execução
        const lastExecution = await prisma.workflowExecution.findFirst({
          where: {
            workflowId: workflow.id,
          },
          orderBy: {
            startedAt: 'desc',
          },
          select: {
            startedAt: true,
            status: true,
          },
        });

        // Extrair tipo de trigger
        const trigger = workflow.trigger as { type?: string };
        const triggerType = trigger?.type || 'manual';

        return {
          workflow: {
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
            status: workflow.status,
            triggerType,
            createdBy: workflow.creator.name,
            lastRun: workflow.lastRun?.toISOString() || null,
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

    // Ordenar por número de execuções (descendente)
    workflowMetrics.sort((a, b) => b.metrics.executions - a.metrics.executions);

    // Calcular totais gerais
    const totals = workflowMetrics.reduce(
      (acc, item) => ({
        executions: acc.executions + item.metrics.executions,
        successExecutions: acc.successExecutions + item.metrics.successExecutions,
        failedExecutions: acc.failedExecutions + item.metrics.failedExecutions,
        pendingExecutions: acc.pendingExecutions + item.metrics.pendingExecutions,
      }),
      {
        executions: 0,
        successExecutions: 0,
        failedExecutions: 0,
        pendingExecutions: 0,
      }
    );

    const overallSuccessRate = totals.executions > 0
      ? (totals.successExecutions / totals.executions) * 100
      : 0;

    const overallFailureRate = totals.executions > 0
      ? (totals.failedExecutions / totals.executions) * 100
      : 0;

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
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
