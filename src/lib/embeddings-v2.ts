/**
 * Embeddings Service v2 - Com pgvector support
 * Suporta múltiplos providers: Hugging Face (gratuito), OpenAI, e local
 */

import pg from 'pg';

const { Pool } = pg;

// Configuração do pool de conexões
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export interface EmbeddingProvider {
  name: string;
  dimensions: number;
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddingsBatch(texts: string[]): Promise<number[][]>;
}

/**
 * Hugging Face Inference API Provider (Gratuito)
 * Modelo: sentence-transformers/all-MiniLM-L6-v2 (384 dimensões)
 * Ou: sentence-transformers/all-mpnet-base-v2 (768 dimensões)
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
    if (!this.apiKey) {
      throw new Error('HuggingFace API key not configured');
    }

    const response = await fetch(
      `https://api-inference.huggingface.co/pipeline/feature-extraction/${this.model}`,
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
    
    // A API pode retornar array simples ou array de arrays
    if (Array.isArray(embedding[0])) {
      return embedding[0];
    }
    return embedding;
  }

  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    // Hugging Face API suporta batching nativo
    if (!this.apiKey) {
      throw new Error('HuggingFace API key not configured');
    }

    const response = await fetch(
      `https://api-inference.huggingface.co/pipeline/feature-extraction/${this.model}`,
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
 * OpenAI Embeddings Provider (Pago)
 * Modelo: text-embedding-3-small (1536 dimensões)
 */
class OpenAIProvider implements EmbeddingProvider {
  name = 'openai';
  dimensions = 1536;
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model = 'text-embedding-3-small') {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.model = model;
    if (model === 'text-embedding-3-large') this.dimensions = 3072;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return data.data.map((d: any) => d.embedding);
  }
}

/**
 * Factory para criar o provider de embeddings
 */
export function createEmbeddingProvider(
  provider: 'huggingface' | 'openai' = 'huggingface',
  apiKey?: string,
  model?: string
): EmbeddingProvider {
  switch (provider) {
    case 'openai':
      return new OpenAIProvider(apiKey, model);
    case 'huggingface':
    default:
      return new HuggingFaceProvider(apiKey, model);
  }
}

// Provider default (usa variável de ambiente para decidir)
export const defaultProvider = createEmbeddingProvider(
  (process.env.EMBEDDING_PROVIDER as 'huggingface' | 'openai') || 'huggingface'
);

/**
 * Salva embeddings no banco usando pgvector
 */
export async function saveEmbeddings(
  documentId: string,
  chunks: Array<{ text: string; index: number }>,
  embeddings: number[][]
): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Deleta embeddings antigos do documento
    await client.query(
      'DELETE FROM document_embeddings WHERE document_id = $1',
      [documentId]
    );

    // Insere novos embeddings
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];
      
      await client.query(
        `INSERT INTO document_embeddings (document_id, chunk_index, chunk_text, embedding, metadata)
         VALUES ($1, $2, $3, $4::vector, $5)`,
        [
          documentId,
          chunk.index,
          chunk.text,
          JSON.stringify(embedding),
          JSON.stringify({ tokens: Math.ceil(chunk.text.length / 4) }),
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
 * Busca documentos semanticamente similares usando pgvector
 */
export async function searchSimilarDocuments(
  queryEmbedding: number[],
  knowledgeBaseId: string,
  options: {
    threshold?: number;
    limit?: number;
  } = {}
): Promise<Array<{
  id: string;
  documentId: string;
  chunkText: string;
  chunkIndex: number;
  similarity: number;
  metadata: any;
}>> {
  const { threshold = 0.7, limit = 5 } = options;

  const result = await pool.query(
    `SELECT * FROM match_documents($1::vector, $2, $3, $4)`,
    [JSON.stringify(queryEmbedding), threshold, limit, knowledgeBaseId]
  );

  return result.rows.map(row => ({
    id: row.id,
    documentId: row.document_id,
    chunkText: row.chunk_text,
    chunkIndex: row.chunk_index,
    similarity: row.similarity,
    metadata: row.metadata,
  }));
}

/**
 * Busca híbrida (vetorial + texto) usando pgvector
 */
export async function hybridSearchDocuments(
  queryText: string,
  queryEmbedding: number[],
  knowledgeBaseId: string,
  options: {
    limit?: number;
    vectorWeight?: number;
  } = {}
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

  const result = await pool.query(
    `SELECT * FROM hybrid_search($1::vector, $2, $3, $4, $5)`,
    [JSON.stringify(queryEmbedding), queryText, limit, knowledgeBaseId, vectorWeight]
  );

  return result.rows.map(row => ({
    id: row.id,
    documentId: row.document_id,
    chunkText: row.chunk_text,
    chunkIndex: row.chunk_index,
    similarity: row.similarity,
    textRank: row.text_rank,
    combinedScore: row.combined_score,
    metadata: row.metadata,
  }));
}

/**
 * Deleta embeddings de um documento
 */
export async function deleteEmbeddings(documentId: string): Promise<void> {
  await pool.query(
    'DELETE FROM document_embeddings WHERE document_id = $1',
    [documentId]
  );
}

/**
 * Gera e salva embeddings para um documento completo
 */
export async function processDocumentEmbeddings(
  documentId: string,
  chunks: Array<{ text: string; index: number }>,
  provider: EmbeddingProvider = defaultProvider
): Promise<void> {
  // Gera embeddings em batch
  const texts = chunks.map(c => c.text);
  const embeddings = await provider.generateEmbeddingsBatch(texts);

  // Salva no banco
  await saveEmbeddings(documentId, chunks, embeddings);
}
