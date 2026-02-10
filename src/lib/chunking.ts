/**
 * Divide um texto em chunks de aproximadamente ~500 tokens
 * Usa uma aproximação simples: 1 token ≈ 4 caracteres
 * Target: 500 tokens ≈ 2000 caracteres por chunk
 */

export interface Chunk {
  text: string;
  index: number;
  tokens: number;
}

const CHARS_PER_TOKEN = 4;
const TARGET_TOKENS = 500;
const TARGET_CHARS = TARGET_TOKENS * CHARS_PER_TOKEN; // ~2000 chars

export function chunkText(text: string, maxChars = TARGET_CHARS): Chunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: Chunk[] = [];

  // Divide por parágrafos primeiro
  const paragraphs = text.split(/\n\n+/);

  let currentChunk = '';
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();

    if (!trimmedParagraph) continue;

    // Se o parágrafo atual sozinho já excede o limite, divide em sentenças
    if (trimmedParagraph.length > maxChars) {
      // Salva chunk atual se não estiver vazio
      if (currentChunk) {
        chunks.push({
          text: currentChunk.trim(),
          index: chunkIndex++,
          tokens: Math.ceil(currentChunk.length / CHARS_PER_TOKEN),
        });
        currentChunk = '';
      }

      // Divide parágrafo grande em sentenças
      const sentences = trimmedParagraph.split(/(?<=[.!?])\s+/);

      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChars && currentChunk) {
          chunks.push({
            text: currentChunk.trim(),
            index: chunkIndex++,
            tokens: Math.ceil(currentChunk.length / CHARS_PER_TOKEN),
          });
          currentChunk = sentence;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
      }
    } else {
      // Se adicionar este parágrafo exceder o limite, salva chunk atual
      if (currentChunk.length + trimmedParagraph.length > maxChars && currentChunk) {
        chunks.push({
          text: currentChunk.trim(),
          index: chunkIndex++,
          tokens: Math.ceil(currentChunk.length / CHARS_PER_TOKEN),
        });
        currentChunk = trimmedParagraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph;
      }
    }
  }

  // Adiciona último chunk se houver
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      index: chunkIndex,
      tokens: Math.ceil(currentChunk.length / CHARS_PER_TOKEN),
    });
  }

  return chunks;
}

export interface ChunkWithEmbedding extends Chunk {
  embedding?: number[];
}

/**
 * Busca chunks relevantes usando keyword matching simples
 */
export function searchChunks(chunks: Chunk[], query: string, topK = 3): Chunk[] {
  if (!query || chunks.length === 0) {
    return [];
  }

  // Extrai palavras-chave da query (remove stop words comuns)
  const stopWords = new Set([
    'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos',
    'em', 'na', 'no', 'nas', 'nos', 'por', 'para', 'com', 'sem',
    'e', 'ou', 'mas', 'que', 'se', 'é', 'são', 'foi', 'ser', 'estar',
  ]);

  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));

  // Calcula score para cada chunk
  const scoredChunks = chunks.map((chunk) => {
    const chunkText = chunk.text.toLowerCase();
    let score = 0;

    for (const word of queryWords) {
      // Conta ocorrências da palavra no chunk
      const regex = new RegExp(word, 'gi');
      const matches = chunkText.match(regex);
      if (matches) {
        score += matches.length;
      }
    }

    return { ...chunk, score };
  });

  // Ordena por score e retorna top K
  return scoredChunks
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Calcula similaridade de cosseno entre dois vetores
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vetores devem ter o mesmo tamanho');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

export interface ChunkWithSimilarity extends ChunkWithEmbedding {
  similarity?: number;
}

/**
 * Busca chunks relevantes usando embeddings vetoriais (similaridade de cosseno)
 */
export function searchChunksBySimilarity(
  chunks: ChunkWithEmbedding[],
  queryEmbedding: number[],
  topK = 3
): ChunkWithSimilarity[] {
  if (!queryEmbedding || chunks.length === 0) {
    return [];
  }

  // Calcula similaridade para cada chunk
  const scoredChunks: ChunkWithSimilarity[] = chunks
    .filter(chunk => chunk.embedding && chunk.embedding.length > 0)
    .map((chunk) => {
      const similarity = cosineSimilarity(queryEmbedding, chunk.embedding!);
      return { ...chunk, similarity };
    });

  // Ordena por similaridade e retorna top K
  return scoredChunks
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
    .slice(0, topK);
}

/**
 * Busca híbrida: combina keyword matching e embeddings
 */
export function hybridSearch(
  chunks: ChunkWithEmbedding[],
  query: string,
  queryEmbedding: number[] | null,
  topK = 3,
  alpha = 0.5 // peso para similaridade (1-alpha para keywords)
): ChunkWithEmbedding[] {
  if (chunks.length === 0) {
    return [];
  }

  // Se não há embedding, usa apenas keyword
  if (!queryEmbedding) {
    return searchChunks(chunks, query, topK) as ChunkWithEmbedding[];
  }

  // Se não há chunks com embeddings, usa apenas keyword
  const chunksWithEmbeddings = chunks.filter(c => c.embedding && c.embedding.length > 0);
  if (chunksWithEmbeddings.length === 0) {
    return searchChunks(chunks, query, topK) as ChunkWithEmbedding[];
  }

  // Busca por keywords
  const keywordResults = searchChunks(chunks, query, chunks.length);
  const keywordScoreMap = new Map(
    keywordResults.map((chunk, idx) => [chunk.index, 1 - idx / keywordResults.length])
  );

  // Busca por similaridade
  const similarityResults = searchChunksBySimilarity(chunksWithEmbeddings, queryEmbedding, chunks.length);
  const similarityScoreMap = new Map(
    similarityResults.map((chunk) => [chunk.index, chunk.similarity || 0])
  );

  // Combina scores
  const hybridScores = chunks.map((chunk) => {
    const keywordScore = keywordScoreMap.get(chunk.index) || 0;
    const similarityScore = similarityScoreMap.get(chunk.index) || 0;
    const hybridScore = (1 - alpha) * keywordScore + alpha * similarityScore;

    return { ...chunk, hybridScore };
  });

  // Ordena por score híbrido e retorna top K
  return hybridScores
    .filter((chunk) => chunk.hybridScore > 0)
    .sort((a, b) => b.hybridScore - a.hybridScore)
    .slice(0, topK);
}
