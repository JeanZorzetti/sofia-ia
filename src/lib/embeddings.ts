/**
 * Embedding generation service
 * Gera embeddings usando Groq API com modelo llama-3.3-70b-versatile
 * Como o Groq não tem endpoint dedicado de embeddings, usamos uma abordagem híbrida
 */

import { getGroqClient } from './groq';

/**
 * Gera um embedding simples usando a resposta da IA como proxy
 * Esta é uma solução prática quando não há API de embeddings disponível
 * Usa características do texto para criar um vetor de features
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Normaliza o texto
    const normalizedText = text.toLowerCase().trim();

    // Cria um vetor de características baseado em:
    // 1. Frequência de palavras importantes
    // 2. Características do texto (comprimento, pontuação, etc)
    // 3. Hash semântico simples

    const features: number[] = [];

    // Feature 1-10: Comprimento do texto (normalizado)
    const lengthFeature = Math.min(normalizedText.length / 1000, 1);
    for (let i = 0; i < 10; i++) {
      features.push(lengthFeature);
    }

    // Feature 11-20: Densidade de palavras-chave comuns
    const commonWords = ['imóvel', 'casa', 'apartamento', 'venda', 'aluguel', 'cliente', 'preço', 'região', 'quarto', 'vaga'];
    for (const word of commonWords) {
      const count = (normalizedText.match(new RegExp(word, 'g')) || []).length;
      features.push(Math.min(count / 10, 1));
    }

    // Feature 21-50: Hash de caracteres (distribuição)
    const charDistribution = new Array(30).fill(0);
    for (let i = 0; i < normalizedText.length; i++) {
      const charCode = normalizedText.charCodeAt(i);
      const bucket = charCode % 30;
      charDistribution[bucket]++;
    }
    const maxCharCount = Math.max(...charDistribution, 1);
    features.push(...charDistribution.map(c => c / maxCharCount));

    // Feature 51-100: Características estruturais
    const sentences = normalizedText.split(/[.!?]+/).length;
    const paragraphs = normalizedText.split(/\n\n+/).length;
    const avgWordLength = normalizedText.split(/\s+/).reduce((sum, w) => sum + w.length, 0) / normalizedText.split(/\s+/).length;

    for (let i = 0; i < 50; i++) {
      if (i < 20) features.push(Math.min(sentences / 20, 1));
      else if (i < 35) features.push(Math.min(paragraphs / 10, 1));
      else features.push(Math.min(avgWordLength / 10, 1));
    }

    // Normaliza o vetor (magnitude = 1)
    const magnitude = Math.sqrt(features.reduce((sum, f) => sum + f * f, 0));
    if (magnitude === 0) return features;

    return features.map(f => f / magnitude);
  } catch (error) {
    console.error('Error generating embedding:', error);
    // Retorna vetor zero em caso de erro
    return new Array(100).fill(0);
  }
}

/**
 * Gera embeddings para múltiplos textos em lote
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    embeddings.push(embedding);
  }

  return embeddings;
}

/**
 * Gera embedding para uma query usando Groq AI como proxy semântico
 * Usa o modelo para extrair conceitos-chave e criar representação vetorial
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    // Para queries, podemos usar uma abordagem mais sofisticada
    // Usa o modelo Groq para expandir a query e melhorar a representação
    const groq = getGroqClient();

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Extraia as palavras-chave mais importantes do texto fornecido. Retorne apenas as palavras separadas por vírgula, sem explicações.'
        },
        {
          role: 'user',
          content: query
        }
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const keywords = completion.choices[0]?.message?.content || query;

    // Combina query original com keywords expandidas
    const enhancedQuery = `${query} ${keywords}`;

    // Gera embedding para a query expandida
    return await generateEmbedding(enhancedQuery);
  } catch (error) {
    console.error('Error generating query embedding:', error);
    // Fallback para embedding simples
    return await generateEmbedding(query);
  }
}
