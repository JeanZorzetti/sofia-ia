import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ─────────────────────────────────────────────────────────
// LEGACY: /api/workflows — Redirects to Flow model
// These endpoints maintain backward compatibility with old UI code
// New code should use /api/flows/ instead
// ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { data: null, success: false, error: { code: 'UNAUTHORIZED', message: 'Autenticação necessária' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { createdBy: user.id };
    if (status) where.status = status;

    const flows = await prisma.flow.findMany({
      where,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { executions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map to legacy format
    const workflows = flows.map(f => ({
      ...f,
      trigger: {},
      conditions: [],
      actions: [],
      lastRun: f.lastRunAt,
    }));

    return NextResponse.json({ data: workflows, success: true, error: null });

  } catch (error) {
    console.error('[GET /api/workflows] Error:', error);
    return NextResponse.json(
      { data: null, success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar workflows' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { data: null, error: { code: 'UNAUTHORIZED', message: 'Autenticação necessária' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, status } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'name é obrigatório' } },
        { status: 400 }
      );
    }

    const flow = await prisma.flow.create({
      data: {
        name,
        description: description || null,
        nodes: [],
        edges: [],
        status: status || 'draft',
        createdBy: user.id,
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ data: flow, error: null }, { status: 201 });

  } catch (error) {
    console.error('[POST /api/workflows] Error:', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Erro ao criar workflow' } },
      { status: 500 }
    );
  }
}
