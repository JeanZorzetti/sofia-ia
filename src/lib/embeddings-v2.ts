// Barrel re-export for backward compatibility
// Actual implementation moved to lib/ai/embeddings.ts (renamed from embeddings-v2.ts)
export {
    createEmbeddingProvider,
    defaultProvider,
    saveEmbeddings,
    searchSimilarDocuments,
    hybridSearchDocuments,
    deleteEmbeddings,
    processDocumentEmbeddings,
} from '@/lib/ai/embeddings'
export type { EmbeddingProvider } from '@/lib/ai/embeddings'
