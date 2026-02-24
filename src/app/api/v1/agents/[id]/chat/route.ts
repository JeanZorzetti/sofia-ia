import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromApiKey } from '@/lib/api-key-auth'
import { getGroqClient } from '@/lib/groq'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/v1/agents/[id]/chat
 * Envia mensagem para um agente via API key.
 * Body: { message: string, conversationId?: string }
 * Retorna: { reply, conversationId, tokens }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized. Provide a valid API key via Authorization: Bearer sk-...' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json().catch(() => ({}))
    const { message, conversationId } = body

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    // Verificar se o agente existe e pertence ao usuário
    const agent = await prisma.agent.findFirst({
      where: { id, createdBy: auth.userId, status: 'active' },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Injetar memória do agente no system prompt se memoryEnabled
    let systemPrompt = agent.systemPrompt
    if (agent.memoryEnabled) {
      const memories = await prisma.agentMemory.findMany({
        where: { agentId: id, userId: auth.userId },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      })

      if (memories.length > 0) {
        const memoryBlock = memories
          .map((m) => `- ${m.key}: ${m.value}`)
          .join('\n')
        systemPrompt = `[Memória do usuário]\n${memoryBlock}\n[/Memória]\n\n${agent.systemPrompt}`
      }
    }

    // Chamar o modelo via Groq diretamente com o system prompt personalizado
    const groq = getGroqClient()
    const completion = await groq.chat.completions.create({
      model: agent.model || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: agent.temperature || 0.7,
      max_tokens: 2048,
    })

    const replyText = completion.choices[0]?.message?.content || ''
    const tokensUsed = completion.usage?.total_tokens || 0

    // Gerar conversationId se não fornecido
    const convId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    return NextResponse.json({
      reply: replyText,
      conversationId: convId,
      tokens: tokensUsed,
      model: completion.model,
    })
  } catch (error: any) {
    console.error('[v1/agents/chat] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
