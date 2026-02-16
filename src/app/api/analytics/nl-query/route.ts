import { NextRequest, NextResponse } from 'next/server';
import { processNLQuery, nlQuerySuggestions } from '@/lib/analytics-nl';
import { getAuthFromRequest } from '@/lib/auth';

/**
 * POST /api/analytics/nl-query
 * Processa consultas em linguagem natural
 * 
 * Body: { query: string, period?: '7d' | '30d' | '90d' | 'today' }
 * 
 * Response: {
 *   success: boolean,
 *   interpretation: string,
 *   result: any,
 *   visualization: 'number' | 'chart' | 'table' | 'text'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { query, period } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    const result = await processNLQuery({ query, period });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing NL query:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/nl-query
 * Retorna sugestões de queries
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      suggestions: nlQuerySuggestions,
    });
  } catch (error) {
    console.error('Error fetching NL query suggestions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
