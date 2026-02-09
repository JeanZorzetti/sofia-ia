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
 * GET /api/analytics/leads
 *
 * Retorna métricas e funil de leads
 *
 * Query params:
 * - period: 7d | 30d | 90d | today | custom (default: 7d)
 * - startDate: data início no formato YYYY-MM-DD (para period=custom)
 * - endDate: data fim no formato YYYY-MM-DD (para period=custom)
 * - status: filtrar por status específico (opcional)
 * - fonte: filtrar por fonte específica (opcional)
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
    const statusFilter = searchParams.get('status');
    const fonteFilter = searchParams.get('fonte');

    const { startDate, endDate } = parsePeriod(period, startDateParam || undefined, endDateParam || undefined);

    // Leads criados no período
    const leadsCreated = await prisma.lead.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(fonteFilter ? { fonte: fonteFilter } : {}),
      },
    });

    // Funil de leads por status
    const leadsByStatus = await prisma.lead.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(fonteFilter ? { fonte: fonteFilter } : {}),
      },
      _count: {
        id: true,
      },
    });

    // Mapear para formato do funil
    const funnel = leadsByStatus.map(item => ({
      status: item.status,
      count: item._count.id,
      percentage: leadsCreated > 0 ? Math.round((item._count.id / leadsCreated) * 10000) / 100 : 0,
    }));

    // Ordenar por ordem lógica do funil
    const statusOrder: Record<string, number> = {
      'novo': 1,
      'contatado': 2,
      'qualificado': 3,
      'negociacao': 4,
      'convertido': 5,
      'perdido': 6,
    };

    funnel.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));

    // Leads por fonte
    const leadsByFonte = await prisma.lead.groupBy({
      by: ['fonte'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      _count: {
        id: true,
      },
    });

    const sourceDistribution = leadsByFonte.map(item => ({
      fonte: item.fonte,
      count: item._count.id,
      percentage: leadsCreated > 0 ? Math.round((item._count.id / leadsCreated) * 10000) / 100 : 0,
    }));

    // Leads qualificados (score >= 60)
    const leadsQualified = await prisma.lead.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        score: {
          gte: 60,
        },
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(fonteFilter ? { fonte: fonteFilter } : {}),
      },
    });

    // Leads convertidos
    const leadsConverted = await prisma.lead.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'convertido',
        ...(fonteFilter ? { fonte: fonteFilter } : {}),
      },
    });

    // Leads perdidos
    const leadsLost = await prisma.lead.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'perdido',
        ...(fonteFilter ? { fonte: fonteFilter } : {}),
      },
    });

    // Taxa de qualificação
    const qualificationRate = leadsCreated > 0
      ? (leadsQualified / leadsCreated) * 100
      : 0;

    // Taxa de conversão
    const conversionRate = leadsCreated > 0
      ? (leadsConverted / leadsCreated) * 100
      : 0;

    // Taxa de perda
    const lossRate = leadsCreated > 0
      ? (leadsLost / leadsCreated) * 100
      : 0;

    // Distribuição de score (simplificada - aggregar por código)
    const allLeadsInPeriod = await prisma.lead.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(fonteFilter ? { fonte: fonteFilter } : {}),
      },
      select: {
        score: true,
      },
    });

    const scoreRanges = {
      '0-19': 0,
      '20-39': 0,
      '40-59': 0,
      '60-79': 0,
      '80-100': 0,
    };

    allLeadsInPeriod.forEach((lead) => {
      const score = lead.score;
      if (score >= 0 && score < 20) scoreRanges['0-19']++;
      else if (score >= 20 && score < 40) scoreRanges['20-39']++;
      else if (score >= 40 && score < 60) scoreRanges['40-59']++;
      else if (score >= 60 && score < 80) scoreRanges['60-79']++;
      else if (score >= 80 && score <= 100) scoreRanges['80-100']++;
    });

    const scoreDistribution = Object.entries(scoreRanges).map(([range, count]) => ({
      range,
      count,
    }));

    // Timeline de criação de leads por dia (simplificada - aggregar por código)
    const leadsForTimeline = await prisma.lead.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(fonteFilter ? { fonte: fonteFilter } : {}),
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const timelineMap = new Map<string, number>();

    leadsForTimeline.forEach((lead) => {
      const dateKey = lead.createdAt.toISOString().split('T')[0];
      timelineMap.set(dateKey, (timelineMap.get(dateKey) || 0) + 1);
    });

    const leadsTimeline = Array.from(timelineMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    return NextResponse.json({
      success: true,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        label: period || '7d',
      },
      summary: {
        leadsCreated,
        leadsQualified,
        leadsConverted,
        leadsLost,
        qualificationRate: Math.round(qualificationRate * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
        lossRate: Math.round(lossRate * 100) / 100,
      },
      funnel,
      sourceDistribution,
      scoreDistribution,
      timeline: leadsTimeline,
    });
  } catch (error) {
    console.error('Error fetching lead analytics:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
