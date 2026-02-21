import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ─────────────────────────────────────────────────────────
// LEGACY: /api/workflows/[id] — Redirects to Flow model
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
      include: {
        executions: { orderBy: { startedAt: 'desc' }, take: 1 },
        creator: { select: { id: true, name: true, email: true } },
      },
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

    const { executions, ...flowData } = flow;
    return NextResponse.json({
      data: {
        ...flowData,
        lastExecution: executions[0] ?? null,
      },
      error: null,
    });
  } catch (error) {
    console.error('[GET /api/workflows/[id]] Error:', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Erro interno' } },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { data: null, error: { code: 'UNAUTHORIZED', message: 'Autenticação necessária' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const existing = await prisma.flow.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Workflow não encontrado' } },
        { status: 404 }
      );
    }

    if (existing.createdBy !== user.id) {
      return NextResponse.json(
        { data: null, error: { code: 'FORBIDDEN', message: 'Acesso negado' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, nodes, edges, status, tags } = body;

    const updated = await prisma.flow.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(nodes !== undefined && { nodes }),
        ...(edges !== undefined && { edges }),
        ...(status !== undefined && { status }),
        ...(tags !== undefined && { tags }),
        version: existing.version + 1,
      },
    });

    return NextResponse.json({ data: updated, error: null });
  } catch (error) {
    console.error('[PUT /api/workflows/[id]] Error:', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Erro interno' } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { data: null, error: { code: 'UNAUTHORIZED', message: 'Autenticação necessária' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const existing = await prisma.flow.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Workflow não encontrado' } },
        { status: 404 }
      );
    }

    if (existing.createdBy !== user.id) {
      return NextResponse.json(
        { data: null, error: { code: 'FORBIDDEN', message: 'Acesso negado' } },
        { status: 403 }
      );
    }

    await prisma.flow.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[DELETE /api/workflows/[id]] Error:', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Erro interno' } },
      { status: 500 }
    );
  }
}
