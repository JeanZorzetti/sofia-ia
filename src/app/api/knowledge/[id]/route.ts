import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { ownerId } from '@/lib/authz';

// GET /api/knowledge/[id] - Busca uma base de conhecimento por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const knowledgeBase = await prisma.knowledgeBase.findFirst({
      where: { id, createdBy: ownerId(auth) },
      include: {
        documents: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!knowledgeBase) {
      return NextResponse.json({ error: 'Base de conhecimento não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ knowledgeBase });
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar base de conhecimento' },
      { status: 500 }
    );
  }
}

// PUT /api/knowledge/[id] - Atualiza uma base de conhecimento
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const owned = await prisma.knowledgeBase.findFirst({
      where: { id, createdBy: ownerId(auth) },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ error: 'Base de conhecimento não encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const { name, agentId, type, config } = body;

    const knowledgeBase = await prisma.knowledgeBase.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(agentId !== undefined && { agentId }),
        ...(type && { type }),
        ...(config && { config }),
      },
      include: {
        documents: true,
      },
    });

    return NextResponse.json({ knowledgeBase });
  } catch (error) {
    console.error('Error updating knowledge base:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar base de conhecimento' },
      { status: 500 }
    );
  }
}

// DELETE /api/knowledge/[id] - Deleta uma base de conhecimento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const { count } = await prisma.knowledgeBase.deleteMany({
      where: { id, createdBy: ownerId(auth) },
    });
    if (count === 0) {
      return NextResponse.json({ error: 'Base de conhecimento não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting knowledge base:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar base de conhecimento' },
      { status: 500 }
    );
  }
}
