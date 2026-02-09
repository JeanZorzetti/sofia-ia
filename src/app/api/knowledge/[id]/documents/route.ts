import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { chunkText } from '@/lib/chunking';

// GET /api/knowledge/[id]/documents - Lista documentos de uma base
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

    const documents = await prisma.knowledgeDocument.findMany({
      where: { knowledgeBaseId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar documentos' },
      { status: 500 }
    );
  }
}

// POST /api/knowledge/[id]/documents - Cria novo documento
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Verifica se a base existe
    const knowledgeBase = await prisma.knowledgeBase.findUnique({
      where: { id },
    });

    if (!knowledgeBase) {
      return NextResponse.json({ error: 'Base de conhecimento não encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const { title, content, sourceUrl, fileType, sourceType } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Título e conteúdo são obrigatórios' }, { status: 400 });
    }

    // Processa o documento
    let processedContent = content;
    let status = 'processing';
    let chunks: string[] = [];

    try {
      // Se for URL, faz fetch do conteúdo
      if (sourceType === 'url' && sourceUrl) {
        // Implementação simples - em produção, usar biblioteca como cheerio
        const response = await fetch(sourceUrl);
        if (response.ok) {
          const html = await response.text();
          // Remove tags HTML básicas
          processedContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }
      }

      // Faz chunking do conteúdo
      chunks = chunkText(processedContent);
      status = 'completed';
    } catch (error) {
      console.error('Error processing document:', error);
      status = 'error';
    }

    const document = await prisma.knowledgeDocument.create({
      data: {
        knowledgeBaseId: id,
        title,
        content: processedContent,
        sourceUrl: sourceUrl || null,
        fileType: fileType || 'text',
        chunks: chunks as any,
        status,
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Erro ao criar documento' },
      { status: 500 }
    );
  }
}
