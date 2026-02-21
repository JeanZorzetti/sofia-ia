import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ─────────────────────────────────────────────────────────
// LEGACY: /api/workflows/[id]/duplicate — Uses Flow model
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
    const original = await prisma.flow.findUnique({ where: { id } });

    if (!original) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Workflow não encontrado' } },
        { status: 404 }
      );
    }

    if (original.createdBy !== user.id) {
      return NextResponse.json(
        { data: null, error: { code: 'FORBIDDEN', message: 'Acesso negado' } },
        { status: 403 }
      );
    }

    const duplicate = await prisma.flow.create({
      data: {
        name: `Cópia de ${original.name}`,
        description: original.description,
        nodes: original.nodes as any,
        edges: original.edges as any,
        settings: original.settings as any,
        variables: original.variables as any,
        triggerType: original.triggerType,
        tags: original.tags,
        icon: original.icon,
        color: original.color,
        status: 'draft',
        createdBy: user.id,
      },
    });

    return NextResponse.json(
      { data: { newWorkflowId: duplicate.id }, error: null },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/workflows/[id]/duplicate] Error:', error);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Erro interno' } },
      { status: 500 }
    );
  }
}
