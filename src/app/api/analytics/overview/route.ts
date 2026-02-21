import { NextRequest, NextResponse } from 'next/server';
import { withAll } from '@/lib/api-middleware';
import { rateLimiters } from '@/lib/rate-limit-redis';
import { TTL } from '@/lib/cache';
import { prisma } from '@/lib/prisma';

interface PeriodFilter {
  startDate: Date;
  endDate: Date;
}

/**
 * Parse período do query param (7d, 30d, 90d, custom)
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
      // Já está configurado para hoje
      break;
    default:
      // Padrão: últimos 7 dias
      start.setDate(now.getDate() - 7);
  }

  return { startDate: start, endDate: end };
}

/**
 * GET /api/analytics/overview
 *
 * Retorna métricas gerais da plataforma com filtro de período
 * Cache: 5 minutos
 * Rate limit: 30 req/minuto
 */
async function handler(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get('period');
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  const { startDate, endDate } = parsePeriod(period, startDateParam || undefined, endDateParam || undefined);

  // Buscar dados agregados da tabela AnalyticsDaily
  const dailyMetrics = await prisma.analyticsDaily.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      date: 'asc',
    },
  });

  // Calcular totais agregados
  const totals = dailyMetrics.reduce(
    (acc, day) => ({
      conversationsStarted: acc.conversationsStarted + day.conversationsStarted,
      conversationsCompleted: acc.conversationsCompleted + day.conversationsCompleted,
      messagesSent: acc.messagesSent + day.messagesSent,
      messagesReceived: acc.messagesReceived + day.messagesReceived,
      leadsCreated: acc.leadsCreated + day.leadsCreated,
      leadsQualified: acc.leadsQualified + day.leadsQualified,
      conversionCount: acc.conversionCount + day.conversionCount,
      aiInteractions: acc.aiInteractions + day.aiInteractions,
      totalResponseTime: acc.totalResponseTime + (day.avgResponseTime * day.messagesReceived),
      responseCount: acc.responseCount + day.messagesReceived,
    }),
    {
      conversationsStarted: 0,
      conversationsCompleted: 0,
      messagesSent: 0,
      messagesReceived: 0,
      leadsCreated: 0,
      leadsQualified: 0,
      conversionCount: 0,
      aiInteractions: 0,
      totalResponseTime: 0,
      responseCount: 0,
    }
  );

  const avgResponseTime = totals.responseCount > 0
    ? totals.totalResponseTime / totals.responseCount
    : 0;

  const conversionRate = totals.leadsCreated > 0
    ? (totals.conversionCount / totals.leadsCreated) * 100
    : 0;

  const qualificationRate = totals.leadsCreated > 0
    ? (totals.leadsQualified / totals.leadsCreated) * 100
    : 0;

  // Estatísticas em tempo real (complementar aos dados históricos)
  const [activeConversations, totalAgents, activeWorkflows] = await Promise.all([
    prisma.conversation.count({
      where: { status: 'active' },
    }),
    prisma.agent.count({
      where: { status: 'active' },
    }),
    prisma.flow.count({
      where: { status: 'active' },
    }),
  ]);

  return NextResponse.json({
    success: true,
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      label: period || '7d',
    },
    overview: {
      conversationsStarted: totals.conversationsStarted,
      conversationsCompleted: totals.conversationsCompleted,
      conversationsActive: activeConversations,
      messagesSent: totals.messagesSent,
      messagesReceived: totals.messagesReceived,
      messagesTotal: totals.messagesSent + totals.messagesReceived,
      leadsCreated: totals.leadsCreated,
      leadsQualified: totals.leadsQualified,
      conversionCount: totals.conversionCount,
      conversionRate: Math.round(conversionRate * 100) / 100,
      qualificationRate: Math.round(qualificationRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      aiInteractions: totals.aiInteractions,
      activeAgents: totalAgents,
      activeWorkflows: activeWorkflows,
    },
    timeline: dailyMetrics.map(day => ({
      date: day.date.toISOString().split('T')[0],
      conversationsStarted: day.conversationsStarted,
      conversationsCompleted: day.conversationsCompleted,
      messagesSent: day.messagesSent,
      messagesReceived: day.messagesReceived,
      leadsCreated: day.leadsCreated,
      leadsQualified: day.leadsQualified,
      conversionCount: day.conversionCount,
      conversionRate: day.conversionRate,
      avgResponseTime: day.avgResponseTime,
      aiInteractions: day.aiInteractions,
    })),
  });
}

// Export com middleware: auth + rate limit + cache
export const GET = withAll(handler, {
  ttl: TTL.MEDIUM, // 5 minutos de cache
  limiter: rateLimiters.analytics,
});
