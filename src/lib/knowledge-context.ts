import { prisma } from '@/lib/prisma';
import { searchChunks, hybridSearch, ChunkWithEmbedding } from '@/lib/chunking';
import { generateQueryEmbedding } from '@/lib/embeddings';

interface Chunk {
  text: string;
  index: number;
  tokens: number;
  embedding?: number[];
}

/**
 * Busca contexto relevante da knowledge base de um agente
 * @param agentId - ID do agente
 * @param query - Pergunta/mensagem do usuário
 * @param topK - Número de chunks a retornar (default: 3)
 * @returns String com o contexto relevante formatado
 */
export async function getKnowledgeContext(
  agentId: string,
  query: string,
  topK = 3
): Promise<string> {
  try {
    // Busca o agente e sua knowledge base
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { knowledgeBaseId: true },
    });

    if (!agent || !agent.knowledgeBaseId) {
      return '';
    }

    // Busca todos os documentos da knowledge base
    const documents = await prisma.knowledgeDocument.findMany({
      where: {
        knowledgeBaseId: agent.knowledgeBaseId,
        status: 'completed',
      },
      select: {
        id: true,
        title: true,
        chunks: true,
      },
    });

    if (documents.length === 0) {
      return '';
    }

    // Agrega todos os chunks de todos os documentos
    const allChunks: Array<ChunkWithEmbedding & { documentTitle: string }> = [];

    for (const doc of documents) {
      const chunks = doc.chunks as unknown as ChunkWithEmbedding[];
      if (Array.isArray(chunks)) {
        chunks.forEach((chunk) => {
          allChunks.push({
            ...chunk,
            documentTitle: doc.title,
          });
        });
      }
    }

    if (allChunks.length === 0) {
      return '';
    }

    // Tenta gerar embedding da query para busca semântica
    let queryEmbedding: number[] | null = null;
    try {
      queryEmbedding = await generateQueryEmbedding(query);
    } catch (error) {
      console.warn('Failed to generate query embedding, falling back to keyword search:', error);
    }

    // Busca os chunks mais relevantes usando busca híbrida (embeddings + keywords)
    const relevantChunks = hybridSearch(allChunks, query, queryEmbedding, topK);

    if (relevantChunks.length === 0) {
      return '';
    }

    // Formata o contexto para injetar no prompt
    const contextParts = relevantChunks.map((chunk, idx) => {
      const typedChunk = chunk as Chunk & { documentTitle: string };
      return `[Contexto ${idx + 1} - ${typedChunk.documentTitle}]\n${typedChunk.text}`;
    });

    return `\n\n===CONTEXTO DA BASE DE CONHECIMENTO===\n\n${contextParts.join('\n\n')}\n\n===FIM DO CONTEXTO===\n\n`;
  } catch (error) {
    console.error('Error fetching knowledge context:', error);
    return '';
  }
}

/**
 * Busca knowledge base por ID e retorna informações básicas
 */
export async function getKnowledgeBaseInfo(knowledgeBaseId: string) {
  try {
    const kb = await prisma.knowledgeBase.findUnique({
      where: { id: knowledgeBaseId },
      include: {
        documents: {
          where: { status: 'completed' },
          select: {
            id: true,
            title: true,
            fileType: true,
            createdAt: true,
          },
        },
      },
    });

    return kb;
  } catch (error) {
    console.error('Error fetching knowledge base info:', error);
    return null;
  }
}
