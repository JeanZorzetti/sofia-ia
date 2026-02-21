import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { executeFlow } from '@/lib/flow-engine';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ─────────────────────────────────────────────────────────
// LEGACY: /api/workflows/[id]/run — Redirects to Flow engine
// ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest, { params }: RouteParams) {
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
      select: { id: true, createdBy: true, status: true },
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

    // Parse input
    let triggerData = {};
    try {
      const body = await request.json();
      triggerData = body || {};
    } catch {
      // Empty body OK
    }

    // Execute using new flow engine
    const result = await executeFlow(id, { triggerData, mode: 'manual' });

    return NextResponse.json(
      { data: { executionId: result.executionId, status: result.status }, error: null },
      { status: 202 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    console.error('[POST /api/workflows/[id]/run] Error:', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
