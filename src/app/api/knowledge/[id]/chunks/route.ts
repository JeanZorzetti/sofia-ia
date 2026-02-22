import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { defaultProvider, searchSimilarDocuments, hybridSearchDocuments } from '@/lib/embeddings-v2'

// GET /api/knowledge/[id]/chunks - List chunks with optional similarity search
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)

    const query = searchParams.get('query')
    const documentId = searchParams.get('documentId')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = (page - 1) * limit

    // Verify knowledge base exists
    const knowledgeBase = await prisma.knowledgeBase.findUnique({
      where: { id },
      select: { id: true, name: true }
    })

    if (!knowledgeBase) {
      return NextResponse.json({ error: 'Base de conhecimento não encontrada' }, { status: 404 })
    }

    // If a search query is provided, do semantic search
    if (query && query.trim()) {
      try {
        const queryEmbedding = await defaultProvider.generateEmbedding(query.trim())

        const results = await hybridSearchDocuments(
          query.trim(),
          queryEmbedding,
          id,
          { limit: 20, vectorWeight: 0.7 }
        )

        // Enrich with document info
        const documentIds = [...new Set(results.map(r => r.documentId))]
        const documents = await prisma.knowledgeDocument.findMany({
          where: { id: { in: documentIds } },
          select: { id: true, title: true, fileType: true }
        })
        const docMap = new Map(documents.map(d => [d.id, d]))

        return NextResponse.json({
          success: true,
          mode: 'semantic_search',
          query,
          results: results.map(r => ({
            id: r.id,
            chunkIndex: r.chunkIndex,
            text: r.chunkText,
            similarity: r.similarity,
            combinedScore: r.combinedScore,
            document: docMap.get(r.documentId) || { id: r.documentId, title: 'Desconhecido' },
            metadata: r.metadata
          }))
        })
      } catch (embeddingError: any) {
        console.error('Semantic search failed:', embeddingError.message)
        // Fall through to regular chunk listing
      }
    }

    // Regular chunk listing from document JSON chunks
    const whereClause: any = { knowledgeBaseId: id, status: 'completed' }
    if (documentId) whereClause.id = documentId

    const documents = await prisma.knowledgeDocument.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        fileType: true,
        chunks: true,
        content: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Flatten and paginate chunks across documents
    const allChunks: any[] = []
    for (const doc of documents) {
      const docChunks = Array.isArray(doc.chunks) ? doc.chunks : []
      docChunks.forEach((chunk: any, idx: number) => {
        allChunks.push({
          id: `${doc.id}-chunk-${idx}`,
          chunkIndex: chunk.index ?? idx,
          text: chunk.text || '',
          tokens: chunk.tokens || 0,
          document: {
            id: doc.id,
            title: doc.title,
            fileType: doc.fileType
          }
        })
      })
    }

    const total = allChunks.length
    const paginated = allChunks.slice(skip, skip + limit)

    // Stats
    const totalDocuments = documents.length
    const totalChunks = allChunks.length
    const totalTokens = allChunks.reduce((sum, c) => sum + (c.tokens || 0), 0)
    const avgTokensPerChunk = totalChunks > 0 ? Math.round(totalTokens / totalChunks) : 0

    return NextResponse.json({
      success: true,
      mode: 'list',
      data: paginated,
      stats: {
        totalDocuments,
        totalChunks,
        totalTokens,
        avgTokensPerChunk
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error('Error fetching chunks:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar chunks' },
      { status: 500 }
    )
  }
}
