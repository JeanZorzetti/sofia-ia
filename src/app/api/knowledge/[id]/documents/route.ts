import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { chunkText } from '@/lib/chunking';
import { defaultProvider, saveEmbeddings } from '@/lib/ai/embeddings';

/**
 * Chunka o conteúdo, gera embeddings reais (OpenRouter 1536d) e salva em
 * document_embeddings via pgvector. Atualiza status do documento no final.
 */
export async function embedDocument(documentId: string, content: string): Promise<void> {
  try {
    const chunks = chunkText(content);
    const texts = chunks.map((c) => c.text);
    const embeddings = await defaultProvider.generateEmbeddingsBatch(texts);
    const indexedChunks = chunks.map((c, i) => ({ text: c.text, index: i }));
    await saveEmbeddings(documentId, indexedChunks, embeddings);
    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { status: 'completed', chunks: chunks as any },
    });
  } catch (err) {
    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { status: 'error' },
    });
    throw err;
  }
}

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

    // Processa conteúdo
    let processedContent = content;
    if (sourceType === 'url' && sourceUrl) {
      try {
        const response = await fetch(sourceUrl);
        if (response.ok) {
          const html = await response.text();
          processedContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }
      } catch { /* mantém conteúdo original */ }
    }

    // Cria documento (status processing)
    const document = await prisma.knowledgeDocument.create({
      data: {
        knowledgeBaseId: id,
        title,
        content: processedContent,
        sourceUrl: sourceUrl || null,
        fileType: fileType || 'text',
        chunks: [],
        status: 'processing',
      },
    });

    // Gera embeddings reais (OpenRouter text-embedding-3-small, 1536d) em background
    embedDocument(document.id, processedContent).catch((err) =>
      console.error('[knowledge/documents] embedDocument error:', err)
    );

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Erro ao criar documento' },
      { status: 500 }
    );
  }
}
