/**
 * Knowledge Context v2 - Com pgvector e busca semântica real
 */

import { prisma } from '@/lib/prisma';
import {
  searchSimilarDocuments,
  hybridSearchDocuments,
  defaultProvider,
  processDocumentEmbeddings,
} from '@/lib/embeddings-v2';
import { chunkText } from '@/lib/chunking';

interface KnowledgeContextOptions {
  topK?: number;
  threshold?: number;
  useHybridSearch?: boolean;
  vectorWeight?: number;
}

/**
 * Busca contexto relevante da knowledge base usando pgvector
 * @param agentId - ID do agente
 * @param query - Pergunta/mensagem do usuário
 * @param options - Opções de busca
 * @returns String com o contexto relevante formatado
 */
export async function getKnowledgeContextV2(
  agentId: string,
  query: string,
  options: KnowledgeContextOptions = {}
): Promise<string> {
  const {
    topK = 3,
    threshold = 0.7,
    useHybridSearch = true,
    vectorWeight = 0.7,
  } = options;

  try {
    // Busca o agente e sua knowledge base
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { knowledgeBaseId: true },
    });

    if (!agent || !agent.knowledgeBaseId) {
      return '';
    }

    // Verifica se há documentos processados com embeddings
    const documentsCount = await prisma.knowledgeDocument.count({
      where: {
        knowledgeBaseId: agent.knowledgeBaseId,
        status: 'completed',
      },
    });

    if (documentsCount === 0) {
      return '';
    }

    // Gera embedding para a query
    const queryEmbedding = await defaultProvider.generateEmbedding(query);

    // Busca chunks relevantes
    let results;
    if (useHybridSearch) {
      results = await hybridSearchDocuments(
        query,
        queryEmbedding,
        agent.knowledgeBaseId,
        { limit: topK, vectorWeight }
      );
    } else {
      results = await searchSimilarDocuments(
        queryEmbedding,
        agent.knowledgeBaseId,
        { threshold, limit: topK }
      );
    }

    if (results.length === 0) {
      return '';
    }

    // Busca informações dos documentos para incluir títulos
    const documentIds = [...new Set(results.map(r => r.documentId))];
    const documents = await prisma.knowledgeDocument.findMany({
      where: { id: { in: documentIds } },
      select: { id: true, title: true },
    });

    const documentTitles = new Map(documents.map(d => [d.id, d.title]));

    // Formata o contexto
    const contextParts = results.map((result, idx) => {
      const title = documentTitles.get(result.documentId) || 'Documento';
      const similarity_pct = Math.round((result.similarity || 0) * 100);
      return `[Contexto ${idx + 1} - ${title} (relevância: ${similarity_pct}%)]\n${result.chunkText}`;
    });

    return `\n\n===CONTEXTO DA BASE DE CONHECIMENTO===\n\n${contextParts.join('\n\n')}\n\n===FIM DO CONTEXTO===\n\n`;
  } catch (error) {
    console.error('Error fetching knowledge context v2:', error);
    // Fallback para sistema antigo em caso de erro
    return '';
  }
}

/**
 * Processa um documento e gera embeddings vetoriais
 * @param documentId - ID do documento
 * @param content - Conteúdo do documento
 */
export async function processDocumentVectorization(
  documentId: string,
  content: string
): Promise<void> {
  try {
    // Atualiza status para processing
    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { status: 'processing' },
    });

    // Divide em chunks
    const chunks = chunkText(content);

    if (chunks.length === 0) {
      throw new Error('No chunks generated from document');
    }

    // Processa embeddings
    await processDocumentEmbeddings(
      documentId,
      chunks.map(c => ({ text: c.text, index: c.index }))
    );

    // Atualiza status para completed e salva chunks metadata
    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: {
        status: 'completed',
        chunks: chunks as any,
      },
    });

    console.log(`Document ${documentId} processed with ${chunks.length} chunks`);
  } catch (error) {
    // Atualiza status para error
    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { status: 'error' },
    });
    throw error;
  }
}

/**
 * Reprocessa todos os documentos de uma knowledge base
 * Útil quando muda o modelo de embeddings
 */
export async function reprocessKnowledgeBase(
  knowledgeBaseId: string
): Promise<{ processed: number; errors: number }> {
  const documents = await prisma.knowledgeDocument.findMany({
    where: {
      knowledgeBaseId,
      status: { in: ['completed', 'error'] },
    },
  });

  let processed = 0;
  let errors = 0;

  for (const doc of documents) {
    try {
      await processDocumentVectorization(doc.id, doc.content);
      processed++;
    } catch (error) {
      console.error(`Error reprocessing document ${doc.id}:`, error);
      errors++;
    }
  }

  return { processed, errors };
}

/**
 * Estatísticas da knowledge base
 */
export async function getKnowledgeBaseStats(knowledgeBaseId: string) {
  const stats = await prisma.knowledgeDocument.aggregate({
    where: { knowledgeBaseId },
    _count: { id: true },
  });

  const byStatus = await prisma.knowledgeDocument.groupBy({
    by: ['status'],
    where: { knowledgeBaseId },
    _count: { id: true },
  });



  return {
    totalDocuments: stats._count.id,
    byStatus: byStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {} as Record<string, number>),
  };
}
