// Barrel re-export for backward compatibility
// Actual implementation moved to lib/ai/chunking.ts
export { chunkText, searchChunks, hybridSearch, cosineSimilarity, searchChunksBySimilarity } from '@/lib/ai/chunking'
export type { Chunk, ChunkWithEmbedding, ChunkWithSimilarity } from '@/lib/ai/chunking'
