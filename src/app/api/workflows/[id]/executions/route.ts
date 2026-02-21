import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ─────────────────────────────────────────────────────────
// LEGACY: /api/workflows/[id]/executions
// Now uses FlowExecution model
// ─────────────────────────────────────────────────────────
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { data: null, error: { code: 'UNAUTHORIZED', message: 'Autenticação necessária' } },
        { status: 401 }
      );
    }

    const { id } = await params;

    const flow = await prisma.flow.findUnique({
      where: { id },
      select: { id: true, createdBy: true },
    });

    if (!flow) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Workflow não encontrado' } },
        { status: 404 }
      );
    }

    if (flow.createdBy !== user.id) {
      return NextResponse.json(
        { data: null, error: { code: 'FORBIDDEN', message: 'Acesso negado' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { flowId: id };
    if (status) where.status = status;

    const [executions, total] = await Promise.all([
      prisma.flowExecution.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.flowExecution.count({ where }),
    ]);

    return NextResponse.json({
      data: executions,
      error: null,
      meta: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + executions.length < total,
      },
    });
  } catch (error) {
    console.error('[GET /api/workflows/[id]/executions] Error:', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar execuções' } },
      { status: 500 }
    );
  }
}
