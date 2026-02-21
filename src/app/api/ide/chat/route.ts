import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { getGroqClient } from '@/lib/groq'
import { getOpenRouterClient } from '@/lib/openrouter'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// ─────────────────────────────────────────────────────────
// POST /api/ide/chat — Multi-provider AI chat for the IDE
// ─────────────────────────────────────────────────────────

interface ChatMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

// ── Model → Provider routing ────────────────────────────────
type Provider = 'groq' | 'openrouter'

const MODEL_PROVIDER_MAP: Record<string, { provider: Provider; modelId: string }> = {
    // ── Groq (native, fast) ──────────────────────────────
    'llama-3.3-70b-versatile': { provider: 'groq', modelId: 'llama-3.3-70b-versatile' },
    'llama-3.1-8b-instant': { provider: 'groq', modelId: 'llama-3.1-8b-instant' },
    'llama-3.2-90b-text-preview': { provider: 'groq', modelId: 'llama-3.2-90b-text-preview' },
    'llama-3.2-11b-text-preview': { provider: 'groq', modelId: 'llama-3.2-11b-text-preview' },
    'gemma2-9b-it': { provider: 'groq', modelId: 'gemma2-9b-it' },
    'mixtral-8x7b-32768': { provider: 'groq', modelId: 'mixtral-8x7b-32768' },
    'deepseek-r1-distill-llama-70b': { provider: 'groq', modelId: 'deepseek-r1-distill-llama-70b' },
    'qwen-2.5-coder-32b': { provider: 'groq', modelId: 'qwen-qwq-32b' },

    // ── Claude (Anthropic via OpenRouter) ─────────────────
    'claude-sonnet-4': { provider: 'openrouter', modelId: 'anthropic/claude-sonnet-4-20250514' },
    'claude-haiku-3.5': { provider: 'openrouter', modelId: 'anthropic/claude-3.5-haiku' },
    'claude-opus-4': { provider: 'openrouter', modelId: 'anthropic/claude-opus-4-20250514' },
    'claude-sonnet-3.5': { provider: 'openrouter', modelId: 'anthropic/claude-3.5-sonnet' },

    // ── GPT (OpenAI via OpenRouter) ──────────────────────
    'gpt-4o': { provider: 'openrouter', modelId: 'openai/gpt-4o' },
    'gpt-4o-mini': { provider: 'openrouter', modelId: 'openai/gpt-4o-mini' },
    'gpt-4.1': { provider: 'openrouter', modelId: 'openai/gpt-4.1' },
    'gpt-4.1-mini': { provider: 'openrouter', modelId: 'openai/gpt-4.1-mini' },
    'o3-mini': { provider: 'openrouter', modelId: 'openai/o3-mini' },

    // ── Gemini (Google via OpenRouter) ───────────────────
    'gemini-2.5-pro': { provider: 'openrouter', modelId: 'google/gemini-2.5-pro-preview' },
    'gemini-2.5-flash': { provider: 'openrouter', modelId: 'google/gemini-2.5-flash-preview' },
    'gemini-2.0-flash': { provider: 'openrouter', modelId: 'google/gemini-2.0-flash-001' },

    // ── DeepSeek (via OpenRouter) ────────────────────────
    'deepseek-v3': { provider: 'openrouter', modelId: 'deepseek/deepseek-chat-v3-0324' },
    'deepseek-r1': { provider: 'openrouter', modelId: 'deepseek/deepseek-r1' },
}

const IDE_SYSTEM_PROMPT = `Você é Sofia, uma assistente de programação de IA integrada à IDE Sofia.

Suas capacidades:
- Analisar e explicar código em qualquer linguagem
- Sugerir refatorações e melhorias
- Encontrar bugs e problemas potenciais
- Escrever testes unitários
- Gerar documentação
- Responder dúvidas sobre programação

Regras:
- Sempre responda em português (Brasil)
- Quando sugerir mudanças no código, use blocos de código markdown com a linguagem destacada
- Seja conciso mas completo
- Se o usuário compartilhar código, analise-o cuidadosamente antes de responder
- Quando houver contexto de arquivo, mencione o nome do arquivo e a linguagem
- Use emojis moderadamente para tornar a conversa mais amigável
- Prefira sugestões práticas a explicações teóricas longas`

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request)
        if (!auth) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        // Rate limit by user ID
        const rl = rateLimit(`ide_chat_${auth.id}`, RATE_LIMITS.ideChat.max, RATE_LIMITS.ideChat.window)
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please wait before sending more messages.' },
                { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
            )
        }

        const body = await request.json()
        const {
            message,
            history = [],
            fileContext,
            model = 'llama-3.3-70b-versatile',
        } = body as {
            message: string
            history: ChatMessage[]
            fileContext?: {
                fileName: string
                filePath: string
                language: string
                content: string
                selection?: string
            }
            model?: string
        }

        if (!message?.trim()) {
            return NextResponse.json({ error: 'Mensagem obrigatória' }, { status: 400 })
        }

        // Resolve provider and model ID
        const routing = MODEL_PROVIDER_MAP[model]
        if (!routing) {
            return NextResponse.json({ error: `Modelo "${model}" não suportado` }, { status: 400 })
        }

        // Build messages
        const messages: ChatMessage[] = [
            { role: 'system', content: IDE_SYSTEM_PROMPT },
        ]

        // Add file context if provided
        if (fileContext) {
            const contextMsg = [
                `📄 **Arquivo ativo:** \`${fileContext.fileName}\` (${fileContext.language})`,
                `📁 **Caminho:** \`${fileContext.filePath}\``,
            ]

            if (fileContext.selection) {
                contextMsg.push(`\n**Código selecionado:**\n\`\`\`${fileContext.language}\n${fileContext.selection}\n\`\`\``)
            } else if (fileContext.content) {
                const lines = fileContext.content.split('\n')
                const truncated = lines.length > 200
                    ? lines.slice(0, 200).join('\n') + '\n// ... (truncado)'
                    : fileContext.content
                contextMsg.push(`\n**Conteúdo do arquivo:**\n\`\`\`${fileContext.language}\n${truncated}\n\`\`\``)
            }

            messages.push({
                role: 'system',
                content: `Contexto do editor:\n${contextMsg.join('\n')}`,
            })
        }

        // Add conversation history (last 20 messages)
        const recentHistory = history.slice(-20)
        for (const msg of recentHistory) {
            messages.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content,
            })
        }

        // Add current message
        messages.push({ role: 'user', content: message })

        // ── Route to correct provider ────────────────────────
        let reply: string

        if (routing.provider === 'groq') {
            const groq = getGroqClient()
            const completion = await groq.chat.completions.create({
                messages,
                model: routing.modelId,
                temperature: 0.3,
                max_tokens: 2048,
            })
            reply = completion.choices[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.'
        } else {
            // OpenRouter
            const openrouter = getOpenRouterClient()
            const completion = await openrouter.chat.completions.create({
                messages,
                model: routing.modelId,
                temperature: 0.3,
                max_tokens: 4096,
            })
            reply = completion.choices[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.'
        }

        return NextResponse.json({
            success: true,
            message: {
                role: 'assistant',
                content: reply,
            },
        })
    } catch (error) {
        console.error('[IDE Chat] Error:', error)
        return NextResponse.json(
            { error: 'Erro ao processar mensagem' },
            { status: 500 }
        )
    }
}
