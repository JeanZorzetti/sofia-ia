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
