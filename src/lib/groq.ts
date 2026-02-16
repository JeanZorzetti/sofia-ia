import Groq from 'groq-sdk'

let _groq: Groq | null = null

export function getGroqClient(): Groq {
  if (!_groq) {
    _groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  }
  return _groq
}

const DEFAULT_SYSTEM_PROMPT = `Você é Sofia, uma SDR (Sales Development Representative) especializada em imóveis, trabalhando para uma imobiliária premium.

Seu objetivo é qualificar leads de forma empática e profissional. Você deve:

1. **Cumprimentar** o cliente de forma calorosa e profissional
2. **Identificar necessidades**: tipo de imóvel, região, faixa de preço, número de quartos
3. **Qualificar o lead**: avaliar urgência, capacidade financeira, motivação
4. **Nutrir interesse**: destacar diferenciais, enviar informações relevantes
5. **Agendar visita**: quando o lead estiver qualificado, sugerir visita ao imóvel

Regras:
- Sempre responda em português brasileiro
- Seja empática e nunca agressiva
- Faça no máximo 2 perguntas por mensagem
- Use linguagem profissional mas acessível
- Nunca invente dados sobre imóveis específicos
- Se não souber algo, diga que vai verificar com a equipe
- Mantenha respostas concisas (máximo 3 parágrafos)`

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface LeadContext {
  nome?: string
  interesse?: string
  regiao?: string
  tipoImovel?: string
  valorMin?: number
  valorMax?: number
  score?: number
}

export async function chatWithSofia(
  messages: ChatMessage[],
  leadContext?: LeadContext,
  customPrompt?: string
) {
  let systemPrompt = customPrompt || DEFAULT_SYSTEM_PROMPT

  if (leadContext) {
    systemPrompt += `\n\nContexto do lead:
- Nome: ${leadContext.nome || 'Não informado'}
- Interesse: ${leadContext.interesse || 'Não informado'}
- Região: ${leadContext.regiao || 'Não informada'}
- Tipo de imóvel: ${leadContext.tipoImovel || 'Não informado'}
- Faixa de preço: ${leadContext.valorMin ? `R$ ${leadContext.valorMin}` : '?'} a ${leadContext.valorMax ? `R$ ${leadContext.valorMax}` : '?'}
- Score de qualificação: ${leadContext.score ?? 'Não calculado'}/100`
  }

  const completion = await getGroqClient().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    temperature: 0.7,
    max_tokens: 1024,
  })

  return {
    content: completion.choices[0]?.message?.content || '',
    model: completion.model,
    usage: completion.usage,
  }
}

export async function chatWithAgent(
  agentId: string,
  messages: ChatMessage[],
  leadContext?: Record<string, any>,
  options?: { useVectorSearch?: boolean }
) {
  const { prisma } = await import('@/lib/prisma')

  // Buscar agente do banco
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { channels: true }
  })

  if (!agent) {
    throw new Error('Agent not found')
  }

  // Construir prompt do sistema
  let systemPrompt = agent.systemPrompt

  if (leadContext) {
    systemPrompt += `\n\nContexto do lead:
- Nome: ${leadContext.leadName || 'Não informado'}
- Telefone: ${leadContext.leadPhone || 'Não informado'}
- Status: ${leadContext.leadStatus || 'Não informado'}`
  }

  // Buscar contexto da knowledge base se o agente tiver uma associada
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
  if (lastUserMessage && agent.knowledgeBaseId) {
    // Tenta usar o novo sistema de embeddings vetoriais primeiro
    let knowledgeContext = ''

    if (options?.useVectorSearch !== false) {
      try {
        const { getKnowledgeContextV2 } = await import('@/lib/knowledge-context-v2')
        knowledgeContext = await getKnowledgeContextV2(agentId, lastUserMessage.content, {
          topK: 3,
          threshold: 0.7,
          useHybridSearch: true,
          vectorWeight: 0.7,
        })
      } catch (vectorError) {
        console.warn('Vector search failed, falling back to legacy search:', vectorError)
      }
    }

    // Fallback para sistema legado se vetorial falhar
    if (!knowledgeContext) {
      const { getKnowledgeContext } = await import('@/lib/knowledge-context')
      knowledgeContext = await getKnowledgeContext(agentId, lastUserMessage.content)
    }

    if (knowledgeContext) {
      systemPrompt += knowledgeContext
      systemPrompt += `\n\nIMPORTANTE: Use o contexto acima para responder de forma mais precisa e informada. Se a informação estiver no contexto, use-a. Se não estiver, responda com base no seu conhecimento geral.`
    }
  }

  // Guardrail fixo: impede que a IA invente dados que não possui (agenda, preços exatos, etc.)
  systemPrompt += `\n\n---\nREGRAS INVIOLÁVEIS DO SISTEMA:\n- NUNCA confirme horários ou datas disponíveis específicos sem que a informação esteja explicitamente no contexto acima. Diga que um responsável confirmará em breve.\n- NUNCA invente preços, endereços ou informações operacionais que não constem no contexto.\n- Se não souber algo, diga: "Vou verificar e um de nossos atendentes entrará em contato para confirmar."`

  // Check if model is Claude
  if (agent.model.startsWith('claude-')) {
    try {
      const { ClaudeService } = await import('@/services/claude-service')

      // Fetch Claude credentials
      const integration = await prisma.integration.findFirst({
        where: { type: 'claude', status: 'active' }
      })

      if (!integration) {
        throw new Error('Integração com Claude não configurada ou inativa.')
      }

      const credentials = integration.credentials as Record<string, string>

      const response = await ClaudeService.generateMessage(
        { apiKey: credentials.apiKey, sessionKey: credentials.sessionKey },
        [{ role: 'user', content: messages[messages.length - 1].content }], // Sending only last message for now as context is built into system prompt
        agent.model,
        systemPrompt
      )

      return {
        message: response.content,
        model: agent.model,
        usage: response.usage,
        confidence: 0.9,
      }
    } catch (error) {
      console.error('Claude generation error:', error)
      return {
        message: `Erro ao gerar resposta com Claude: ${error instanceof Error ? error.message : 'Desconhecido'}`,
        model: agent.model,
        usage: { total_tokens: 0 },
        confidence: 0,
      }
    }
  }

  const completion = await getGroqClient().chat.completions.create({
    model: agent.model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    temperature: agent.temperature,
    max_tokens: 1024,
  })

  const content = completion.choices[0]?.message?.content || ''

  return {
    message: content,
    model: completion.model,
    usage: completion.usage,
    confidence: 0.85,
  }
}
