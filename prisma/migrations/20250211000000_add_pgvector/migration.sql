-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add pgvector support check
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE EXCEPTION 'pgvector extension not available. Please install pgvector first.';
  END IF;
END $$;

-- Create document_embeddings table with vector support
CREATE TABLE IF NOT EXISTS "document_embeddings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "document_id" UUID NOT NULL REFERENCES "knowledge_documents"("id") ON DELETE CASCADE,
  "chunk_index" INTEGER NOT NULL,
  "chunk_text" TEXT NOT NULL,
  "embedding" vector(1536) NOT NULL,
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index for document_id + chunk_index
CREATE UNIQUE INDEX IF NOT EXISTS "document_embeddings_document_id_chunk_index_key" 
  ON "document_embeddings"("document_id", "chunk_index");

-- Create index for document lookups
CREATE INDEX IF NOT EXISTS "document_embeddings_document_id_idx" 
  ON "document_embeddings"("document_id");

-- Create HNSW index for fast vector similarity search
-- Using cosine similarity (vector_cosine_ops)
CREATE INDEX IF NOT EXISTS "document_embeddings_embedding_idx" 
  ON "document_embeddings" 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Create function for semantic search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_knowledge_base_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  document_id uuid,
  chunk_text text,
  chunk_index int,
  similarity float,
  metadata jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    de.id,
    de.document_id,
    de.chunk_text,
    de.chunk_index,
    1 - (de.embedding <=> query_embedding) AS similarity,
    de.metadata
  FROM document_embeddings de
  JOIN knowledge_documents kd ON de.document_id = kd.id
  WHERE 
    1 - (de.embedding <=> query_embedding) > match_threshold
    AND (p_knowledge_base_id IS NULL OR kd.knowledge_base_id = p_knowledge_base_id)
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Create function for hybrid search (combining vector + text search)
CREATE OR REPLACE FUNCTION hybrid_search(
  query_embedding vector(1536),
  query_text text,
  match_count int,
  p_knowledge_base_id uuid DEFAULT NULL,
  vector_weight float DEFAULT 0.7
)
RETURNS TABLE(
  id uuid,
  document_id uuid,
  chunk_text text,
  chunk_index int,
  similarity float,
  text_rank float,
  combined_score float,
  metadata jsonb
) AS $$
BEGIN
  RETURN QUERY
  WITH vector_scores AS (
    SELECT 
      de.id,
      de.document_id,
      de.chunk_text,
      de.chunk_index,
      1 - (de.embedding <=> query_embedding) AS similarity,
      de.metadata
    FROM document_embeddings de
    JOIN knowledge_documents kd ON de.document_id = kd.id
    WHERE (p_knowledge_base_id IS NULL OR kd.knowledge_base_id = p_knowledge_base_id)
  ),
  text_scores AS (
    SELECT 
      de.id,
      ts_rank(to_tsvector('portuguese', de.chunk_text), plainto_tsquery('portuguese', query_text)) AS text_rank
    FROM document_embeddings de
    JOIN knowledge_documents kd ON de.document_id = kd.id
    WHERE (p_knowledge_base_id IS NULL OR kd.knowledge_base_id = p_knowledge_base_id)
      AND to_tsvector('portuguese', de.chunk_text) @@ plainto_tsquery('portuguese', query_text)
  )
  SELECT 
    vs.id,
    vs.document_id,
    vs.chunk_text,
    vs.chunk_index,
    vs.similarity,
    COALESCE(ts.text_rank, 0) AS text_rank,
    (vector_weight * vs.similarity + (1 - vector_weight) * COALESCE(ts.text_rank, 0)) AS combined_score,
    vs.metadata
  FROM vector_scores vs
  LEFT JOIN text_scores ts ON vs.id = ts.id
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
