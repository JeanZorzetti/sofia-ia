/**
 * Unit tests for src/lib/ai/groq.ts
 *
 * Tests lazy Groq client initialization, API delegation, and response shape.
 * Mocks groq-sdk to avoid real HTTP calls.
 *
 * IMPORTANT: groq-sdk is an ESM module. We must set __esModule:true in the
 * mock factory so that ts-jest's CJS interop picks up the default export as
 * a constructor rather than an object with a .default property.
 *
 * We use `var` (not `let`/`const`) to share variables with the hoisted factory.
 */

/* eslint-disable no-var */
var mockCreate: jest.Mock
var mockGroqInstance: { chat: { completions: { create: jest.Mock } } }

jest.mock('groq-sdk', () => {
  mockCreate = jest.fn()
  mockGroqInstance = { chat: { completions: { create: mockCreate } } }
  const MockGroqCtor = jest.fn().mockImplementation(() => mockGroqInstance)
  return { __esModule: true, default: MockGroqCtor }
})

// Prevent chatWithAgent from hitting the real database
jest.mock('@/lib/prisma', () => ({
  prisma: { agent: { findUnique: jest.fn() } },
}))

import { getGroqClient, chatWithSofia } from '@/lib/ai/groq'

function makeCompletion(content: string, model = 'llama-3.3-70b-versatile') {
  return {
    choices: [{ message: { content, role: 'assistant' } }],
    model,
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  }
}

beforeEach(() => {
  mockCreate.mockReset()
})

// ---------------------------------------------------------------------------
// getGroqClient
// ---------------------------------------------------------------------------
describe('getGroqClient()', () => {
  it('should return an object with a chat.completions.create function', () => {
    const client = getGroqClient()
    expect(client).toBeDefined()
    expect(typeof (client as any).chat?.completions?.create).toBe('function')
  })

  it('should return a singleton — same object reference each call', () => {
    const a = getGroqClient()
    const b = getGroqClient()
    expect(a).toBe(b)
  })

  it('should expose the mocked create function on the client', () => {
    const client = getGroqClient()
    expect((client as any).chat.completions.create).toBe(mockCreate)
  })
})

// ---------------------------------------------------------------------------
// chatWithSofia
// ---------------------------------------------------------------------------
describe('chatWithSofia()', () => {
  it('should call completions.create and return the content', async () => {
    mockCreate.mockResolvedValueOnce(makeCompletion('Ola! Como posso ajudar?'))

    const result = await chatWithSofia([{ role: 'user', content: 'Oi, Sofia!' }])

    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(result.content).toBe('Ola! Como posso ajudar?')
  })

  it('should prepend a system message to the API payload', async () => {
    mockCreate.mockResolvedValueOnce(makeCompletion('Ok'))

    await chatWithSofia([{ role: 'user', content: 'Teste' }])

    const payload = mockCreate.mock.calls[0][0]
    expect(payload.messages[0].role).toBe('system')
    expect(payload.messages[1]).toMatchObject({ role: 'user', content: 'Teste' })
  })

  it('should inject lead context into the system prompt when provided', async () => {
    mockCreate.mockResolvedValueOnce(makeCompletion('Entendido'))

    await chatWithSofia(
      [{ role: 'user', content: 'Quero comprar' }],
      { nome: 'Maria', score: 90 }
    )

    const systemContent: string = mockCreate.mock.calls[0][0].messages[0].content
    expect(systemContent).toContain('Maria')
    expect(systemContent).toContain('90')
  })

  it('should use a custom system prompt when provided', async () => {
    mockCreate.mockResolvedValueOnce(makeCompletion('Customizado'))

    const custom = 'Voce e um expert em vendas imobiliarias.'
    await chatWithSofia([{ role: 'user', content: 'Oi' }], undefined, custom)

    const systemContent: string = mockCreate.mock.calls[0][0].messages[0].content
    expect(systemContent).toBe(custom)
  })

  it('should return an empty string when choices array is empty', async () => {
    mockCreate.mockResolvedValueOnce({ choices: [], model: 'x', usage: {} })

    const result = await chatWithSofia([{ role: 'user', content: 'Test' }])
    expect(result.content).toBe('')
  })

  it('should return model and usage metadata from the API response', async () => {
    const usage = { prompt_tokens: 5, completion_tokens: 15, total_tokens: 20 }
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'Pong' } }],
      model: 'llama-3.3-70b-versatile',
      usage,
    })

    const result = await chatWithSofia([{ role: 'user', content: 'Ping' }])
    expect(result.model).toBe('llama-3.3-70b-versatile')
    expect(result.usage).toEqual(usage)
  })
})
