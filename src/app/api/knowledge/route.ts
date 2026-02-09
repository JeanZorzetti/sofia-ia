import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

// GET /api/knowledge - Lista todas as bases de conhecimento
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const knowledgeBases = await prisma.knowledgeBase.findMany({
      include: {
        documents: {
          select: {
            id: true,
            title: true,
            status: true,
            fileType: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Adicionar contagem de documentos e status
    const basesWithStats = knowledgeBases.map((kb) => ({
      ...kb,
      documentCount: kb.documents.length,
      processedCount: kb.documents.filter((d) => d.status === 'completed').length,
      processingCount: kb.documents.filter((d) => d.status === 'processing').length,
      errorCount: kb.documents.filter((d) => d.status === 'error').length,
    }));

    return NextResponse.json({ knowledgeBases: basesWithStats });
  } catch (error) {
    console.error('Error fetching knowledge bases:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar bases de conhecimento' },
      { status: 500 }
    );
  }
}

// POST /api/knowledge - Cria uma nova base de conhecimento
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, agentId, type, config } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const knowledgeBase = await prisma.knowledgeBase.create({
      data: {
        name,
        agentId: agentId || null,
        type: type || 'general',
        config: config || {},
      },
      include: {
        documents: true,
      },
    });

    return NextResponse.json({ knowledgeBase }, { status: 201 });
  } catch (error) {
    console.error('Error creating knowledge base:', error);
    return NextResponse.json(
      { error: 'Erro ao criar base de conhecimento' },
      { status: 500 }
    );
  }
}
