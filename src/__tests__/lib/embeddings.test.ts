/**
 * Unit tests for src/lib/embeddings.ts
 *
 * Tests deterministic embedding generation, batch processing, and query embedding.
 * embeddings.ts imports getGroqClient from './groq' (barrel at src/lib/groq.ts),
 * so we mock '@/lib/groq'.
 *
 * NOTE: jest.mock() is hoisted; use `var` to share state with the factory.
 */

// eslint-disable-next-line no-var
var mockCreate: jest.Mock

jest.mock('@/lib/groq', () => {
  mockCreate = jest.fn()
  return {
    getGroqClient: jest.fn(() => ({
      chat: { completions: { create: mockCreate } },
    })),
  }
})

import { generateEmbedding, generateEmbeddingsBatch, generateQueryEmbedding } from '@/lib/embeddings'
import { getGroqClient } from '@/lib/groq'

const mockGetGroqClient = getGroqClient as jest.MockedFunction<typeof getGroqClient>

beforeEach(() => {
  jest.clearAllMocks()
  // Ensure fresh mockCreate function after clearAllMocks
  mockCreate = jest.fn()
  mockGetGroqClient.mockReturnValue({
    chat: { completions: { create: mockCreate } },
  } as any)
})

// ---------------------------------------------------------------------------
// generateEmbedding
// ---------------------------------------------------------------------------
describe('generateEmbedding()', () => {
  it('should return a non-empty numeric array', async () => {
    const embedding = await generateEmbedding('produto imobiliario')
    expect(Array.isArray(embedding)).toBe(true)
    expect(embedding.length).toBeGreaterThan(0)
    embedding.forEach((v) => expect(typeof v).toBe('number'))
  })

  it('should return a normalised vector with magnitude approximately 1', async () => {
    const embedding = await generateEmbedding('casa a venda em Sao Paulo')
    const magnitude = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0))
    expect(magnitude).toBeCloseTo(1, 5)
  })

  it('should be deterministic — identical text produces identical vectors', async () => {
    const a = await generateEmbedding('texto de teste')
    const b = await generateEmbedding('texto de teste')
    expect(a).toEqual(b)
  })

  it('should return vectors of the same dimension for different texts', async () => {
    const short = await generateEmbedding('curto')
    const long = await generateEmbedding('texto muito mais longo com varias palavras e detalhes sobre imoveis')
    expect(short.length).toBe(long.length)
  })

  it('should not throw for an empty string input', async () => {
    await expect(generateEmbedding('')).resolves.toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// generateEmbeddingsBatch
// ---------------------------------------------------------------------------
describe('generateEmbeddingsBatch()', () => {
  it('should return one embedding per input text', async () => {
    const embeddings = await generateEmbeddingsBatch(['um', 'dois', 'tres'])
    expect(embeddings).toHaveLength(3)
  })

  it('should return an empty array for empty input', async () => {
    expect(await generateEmbeddingsBatch([])).toEqual([])
  })

  it('should return valid numeric arrays for each text', async () => {
    const embeddings = await generateEmbeddingsBatch(['alpha', 'beta'])
    embeddings.forEach((emb) => {
      expect(Array.isArray(emb)).toBe(true)
      expect(emb.length).toBeGreaterThan(0)
    })
  })
})

// ---------------------------------------------------------------------------
// generateQueryEmbedding
// ---------------------------------------------------------------------------
describe('generateQueryEmbedding()', () => {
  it('should call Groq to expand keywords and return a valid embedding', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'imovel, apartamento, venda, preco' } }],
    })

    const embedding = await generateQueryEmbedding('quero comprar apartamento')

    expect(mockGetGroqClient).toHaveBeenCalledTimes(1)
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(Array.isArray(embedding)).toBe(true)
    expect(embedding.length).toBeGreaterThan(0)
  })

  it('should fall back to simple embedding when Groq client throws', async () => {
    mockGetGroqClient.mockImplementationOnce(() => {
      throw new Error('Groq API unavailable')
    })

    const embedding = await generateQueryEmbedding('consulta qualquer')
    expect(Array.isArray(embedding)).toBe(true)
    expect(embedding.length).toBeGreaterThan(0)
  })

  it('should handle an empty Groq response without throwing', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '' } }],
    })

    const embedding = await generateQueryEmbedding('busca com resposta vazia')
    expect(Array.isArray(embedding)).toBe(true)
    expect(embedding.length).toBeGreaterThan(0)
  })
})
