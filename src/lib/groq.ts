import Groq from 'groq-sdk'

let _groq: Groq | null = null

function getGroqClient(): Groq {
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
  leadContext?: Record<string, any>
) {
  const { prisma } = await import('@/lib/prisma')
  const { getKnowledgeContext } = await import('@/lib/knowledge-context')

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
    const knowledgeContext = await getKnowledgeContext(agentId, lastUserMessage.content)
    if (knowledgeContext) {
      systemPrompt += knowledgeContext
      systemPrompt += `\n\nIMPORTANTE: Use o contexto acima para responder de forma mais precisa e informada. Se a informação estiver no contexto, use-a. Se não estiver, responda com base no seu conhecimento geral.`
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
    confidence: 0.85, // Placeholder - pode ser calculado baseado em outras métricas
  }
}
