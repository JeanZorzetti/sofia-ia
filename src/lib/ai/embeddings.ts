/**
 * Embeddings Service v2 - pgvector storage
 * Providers: OpenRouter (text-embedding-3-small, 1536d), HuggingFace (384d)
 * Search: pgvector HNSW index with cosine distance — query runs in DB, not in memory
 */

import pg from 'pg';

const { Pool } = pg;

// Lazy pool to avoid build-time connection errors
let _pool: InstanceType<typeof Pool> | null = null;
function getPool() {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }
  return _pool;
}

export interface EmbeddingProvider {
  name: string;
  dimensions: number;
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddingsBatch(texts: string[]): Promise<number[][]>;
}

/**
 * OpenRouter Embeddings Provider (text-embedding-3-small via OpenAI)
 * 1536 dimensions, requires OPENROUTER_API_KEY
 */
class OpenRouterProvider implements EmbeddingProvider {
  name = 'openrouter';
  dimensions = 1536;
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model = 'text-embedding-3-small') {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
    this.model = model;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) throw new Error('OpenRouter API key not configured');

    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: this.model, input: text }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter embedding error: ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) throw new Error('OpenRouter API key not configured');

    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: this.model, input: texts }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter embedding error: ${error}`);
    }

    const data = await response.json();
    // OpenRouter returns sorted by index
    return data.data.sort((a: any, b: any) => a.index - b.index).map((d: any) => d.embedding);
  }
}

/**
 * HuggingFace Inference Provider (fallback - may require permissions)
 */
class HuggingFaceProvider implements EmbeddingProvider {
  name = 'huggingface';
  dimensions = 384;
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model = 'sentence-transformers/all-MiniLM-L6-v2') {
    this.apiKey = apiKey || process.env.HUGGINGFACE_API_KEY || '';
    this.model = model;
    if (model.includes('mpnet')) this.dimensions = 768;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) throw new Error('HuggingFace API key not configured');

    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/${this.model}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HuggingFace API error: ${error}`);
    }

    const embedding = await response.json();
    if (Array.isArray(embedding[0])) return embedding[0];
    return embedding;
  }

  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) throw new Error('HuggingFace API key not configured');

    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/${this.model}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: texts }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HuggingFace API error: ${error}`);
    }

    return await response.json();
  }
}

/**
 * Factory for embedding providers
 */
export function createEmbeddingProvider(
  provider: 'openrouter' | 'huggingface' | 'openai' = 'openrouter',
  apiKey?: string,
  model?: string
): EmbeddingProvider {
  switch (provider) {
    case 'huggingface':
      return new HuggingFaceProvider(apiKey, model);
    case 'openrouter':
    case 'openai':
    default:
      return new OpenRouterProvider(apiKey, model);
  }
}

// Default provider: OpenRouter (uses OPENROUTER_API_KEY env var)
export const defaultProvider = createEmbeddingProvider(
  (process.env.EMBEDDING_PROVIDER as any) === 'huggingface' ? 'huggingface' : 'openrouter'
);

/**
 * Save embeddings as pgvector — replaces old JSONB approach
 */
export async function saveEmbeddings(
  documentId: string,
  chunks: Array<{ text: string; index: number }>,
  embeddings: number[][]
): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM document_embeddings WHERE document_id = $1', [documentId]);

    for (let i = 0; i < chunks.length; i++) {
      const vec = `[${embeddings[i].join(',')}]`;
      await client.query(
        `INSERT INTO document_embeddings (id, document_id, chunk_index, chunk_text, embedding, metadata)
         VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, $5)`,
        [
          documentId,
          chunks[i].index,
          chunks[i].text,
          vec,
          JSON.stringify({ tokens: Math.ceil(chunks[i].text.length / 4) }),
        ]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Vector search using pgvector HNSW index (cosine distance).
 * Runs entirely in DB — no in-memory iteration.
 */
export async function searchSimilarDocuments(
  queryEmbedding: number[],
  knowledgeBaseId: string,
  options: { threshold?: number; limit?: number } = {}
): Promise<Array<{
  id: string;
  documentId: string;
  chunkText: string;
  chunkIndex: number;
  similarity: number;
  metadata: any;
}>> {
  const { threshold = 0.3, limit = 5 } = options;
  const pool = getPool();
  const vec = `[${queryEmbedding.join(',')}]`;

  const result = await pool.query(
    `SELECT
       de.id,
       de.document_id,
       de.chunk_text,
       de.chunk_index,
       de.metadata,
       1 - (de.embedding <=> $1::vector) AS similarity
     FROM document_embeddings de
     JOIN knowledge_documents kd ON de.document_id = kd.id
     WHERE kd.knowledge_base_id = $2
       AND kd.status = 'completed'
       AND de.embedding IS NOT NULL
       AND 1 - (de.embedding <=> $1::vector) >= $3
     ORDER BY de.embedding <=> $1::vector
     LIMIT $4`,
    [vec, knowledgeBaseId, threshold, limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    documentId: row.document_id,
    chunkText: row.chunk_text,
    chunkIndex: row.chunk_index,
    similarity: parseFloat(row.similarity),
    metadata: row.metadata,
  }));
}

/**
 * Hybrid search: pgvector cosine + PostgreSQL full-text rank, combined in DB.
 */
export async function hybridSearchDocuments(
  queryText: string,
  queryEmbedding: number[],
  knowledgeBaseId: string,
  options: { limit?: number; vectorWeight?: number } = {}
): Promise<Array<{
  id: string;
  documentId: string;
  chunkText: string;
  chunkIndex: number;
  similarity: number;
  textRank: number;
  combinedScore: number;
  metadata: any;
}>> {
  const { limit = 5, vectorWeight = 0.7 } = options;
  const pool = getPool();
  const vec = `[${queryEmbedding.join(',')}]`;

  const result = await pool.query(
    `SELECT
       de.id,
       de.document_id,
       de.chunk_text,
       de.chunk_index,
       de.metadata,
       1 - (de.embedding <=> $1::vector)                         AS similarity,
       ts_rank_cd(to_tsvector('portuguese', de.chunk_text),
                  plainto_tsquery('portuguese', $2))              AS text_rank,
       $3::float * (1 - (de.embedding <=> $1::vector))
         + (1 - $3::float)
         * ts_rank_cd(to_tsvector('portuguese', de.chunk_text),
                      plainto_tsquery('portuguese', $2))          AS combined_score
     FROM document_embeddings de
     JOIN knowledge_documents kd ON de.document_id = kd.id
     WHERE kd.knowledge_base_id = $4
       AND kd.status = 'completed'
       AND de.embedding IS NOT NULL
     ORDER BY combined_score DESC
     LIMIT $5`,
    [vec, queryText, vectorWeight, knowledgeBaseId, limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    documentId: row.document_id,
    chunkText: row.chunk_text,
    chunkIndex: row.chunk_index,
    similarity: parseFloat(row.similarity),
    textRank: parseFloat(row.text_rank),
    combinedScore: parseFloat(row.combined_score),
    metadata: row.metadata,
  }));
}

/**
 * Delete embeddings for a document
 */
export async function deleteEmbeddings(documentId: string): Promise<void> {
  const pool = getPool();
  await pool.query('DELETE FROM document_embeddings WHERE document_id = $1', [documentId]);
}

/**
 * Generate and save embeddings for a document
 */
export async function processDocumentEmbeddings(
  documentId: string,
  chunks: Array<{ text: string; index: number }>,
  provider: EmbeddingProvider = defaultProvider
): Promise<void> {
  const texts = chunks.map((c) => c.text);
  const embeddings = await provider.generateEmbeddingsBatch(texts);
  await saveEmbeddings(documentId, chunks, embeddings);
}
