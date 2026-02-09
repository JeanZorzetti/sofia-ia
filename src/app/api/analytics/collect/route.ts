import { NextRequest, NextResponse } from 'next/server';
import { populateDailyAnalytics, populateAnalyticsForLastDays } from '@/lib/analytics-collector';

/**
 * POST /api/analytics/collect
 *
 * Endpoint para coletar e popular métricas de analytics.
 * Pode ser chamado via cron job (Vercel Cron) ou manualmente.
 *
 * Query params:
 * - date: data específica no formato YYYY-MM-DD (opcional, padrão: hoje)
 * - days: número de dias para popular retroativamente (opcional, padrão: 1)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verificar autorização via header ou query param (para cron jobs)
    const authHeader = request.headers.get('authorization');
    const cronSecret = request.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production';

    const isAuthorized =
      authHeader === `Bearer ${expectedSecret}` ||
      cronSecret === expectedSecret;

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const dateParam = request.nextUrl.searchParams.get('date');
    const daysParam = request.nextUrl.searchParams.get('days');

    if (dateParam) {
      // Popular data específica
      const date = new Date(dateParam);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }

      await populateDailyAnalytics(date);

      return NextResponse.json({
        success: true,
        message: `Analytics collected for ${dateParam}`,
        date: dateParam,
      });
    } else if (daysParam) {
      // Popular últimos N dias
      const days = parseInt(daysParam, 10);
      if (isNaN(days) || days < 1 || days > 365) {
        return NextResponse.json(
          { error: 'Invalid days parameter. Must be between 1 and 365' },
          { status: 400 }
        );
      }

      await populateAnalyticsForLastDays(days);

      return NextResponse.json({
        success: true,
        message: `Analytics collected for last ${days} days`,
        days,
      });
    } else {
      // Popular hoje por padrão
      const today = new Date();
      await populateDailyAnalytics(today);

      return NextResponse.json({
        success: true,
        message: 'Analytics collected for today',
        date: today.toISOString().split('T')[0],
      });
    }
  } catch (error) {
    console.error('Error collecting analytics:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/collect
 *
 * Retorna informações sobre o cron job de coleta
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: 'Analytics collection endpoint',
    usage: {
      method: 'POST',
      auth: 'Bearer token or ?secret=xxx',
      params: {
        date: 'YYYY-MM-DD (optional, default: today)',
        days: 'number (optional, default: 1, max: 365)',
      },
      examples: [
        'POST /api/analytics/collect?secret=xxx',
        'POST /api/analytics/collect?secret=xxx&date=2024-01-15',
        'POST /api/analytics/collect?secret=xxx&days=30',
      ],
    },
  });
}
