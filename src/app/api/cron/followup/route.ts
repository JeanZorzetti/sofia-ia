/**
 * GET /api/cron/followup
 * Follow-up automático — seg-sex 8:50 (50 8 * * 1-5)
 *
 * 1. Busca conversas ativas e inativas há mais de INACTIVITY_HOURS
 * 2. Classifica via Groq: pendente_resposta | sem_resposta | encerrada | pessoal
 * 3. Gera follow-up contextual e envia via WhatsApp
 *
 * Acionado pelo cron externo (Vercel/Easypanel):
 *   50 8 * * 1-5  →  /api/cron/followup  (Bearer CRON_SECRET)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMessage } from '@/lib/evolution-service'
import { getGroqClient } from '@/lib/ai/groq'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CRON_SECRET = process.env.CRON_SECRET || 'sofia-cron-secret-2026'
const INACTIVITY_HOURS = 4

type FollowupResult = { conversationId: string; action: string }

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const threshold = new Date(now.getTime() - INACTIVITY_HOURS * 60 * 60 * 1000)
  const todayKey = now.toISOString().slice(0, 10)

  const results: FollowupResult[] = []

  try {
    // Conversas ativas, gerenciadas pela IA, sem atividade há mais de INACTIVITY_HOURS
    const conversations = await prisma.conversation.findMany({
      where: {
        status: 'active',
        handledBy: 'ai',
        agentId: { not: null },
        whatsappChatId: { not: null },
        lastMessageAt: { lt: threshold },
      },
      include: {
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 10,
        },
        lead: { select: { nome: true } },
      },
      take: 50,
    })

    for (const conv of conversations) {
      // Pular se a última mensagem da IA foi hoje (já fizemos follow-up hoje)
      const lastAiMsg = conv.messages.find(m => m.isAiGenerated || m.sender === 'ai')
      if (lastAiMsg && lastAiMsg.sentAt.toISOString().slice(0, 10) === todayKey) {
        results.push({ conversationId: conv.id, action: 'skipped_today' })
        continue
      }

      // Buscar agente + instância WhatsApp
      const agent = await prisma.agent.findUnique({
        where: { id: conv.agentId! },
        select: {
          model: true,
          systemPrompt: true,
          channels: {
            where: { channel: 'whatsapp', isActive: true },
            select: { config: true },
          },
        },
      })
      if (!agent) continue

      const instanceName = (agent.channels[0]?.config as Record<string, unknown>)?.instanceName as string | undefined
      if (!instanceName) continue

      // Montar histórico para classificação
      const history = conv.messages
        .slice()
        .reverse()
        .map(m => `${m.isAiGenerated || m.sender === 'ai' ? 'Agente' : 'Lead'}: ${m.content}`)
        .join('\n')

      // Classificar conversa
      let classification = 'sem_resposta'
      try {
        const classRes = await getGroqClient().chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: [
                'Analise o histórico de conversa e classifique como UMA das opções:',
                '- "pendente_resposta": lead fez pergunta/demonstrou interesse e não recebeu resposta completa',
                '- "sem_resposta": lead não respondeu à última mensagem do agente',
                '- "encerrada": conversa concluída (agendamento feito, lead desistiu claramente)',
                '- "pessoal": conversa pessoal/irrelevante para negócios',
                'Responda APENAS com a classificação, sem explicação.',
              ].join('\n'),
            },
            {
              role: 'user',
              content: `Histórico:\n${history || 'Sem mensagens'}`,
            },
          ],
          max_tokens: 20,
          temperature: 0,
        })
        const raw = classRes.choices[0]?.message?.content?.trim().toLowerCase() || ''
        if (['pendente_resposta', 'sem_resposta', 'encerrada', 'pessoal'].includes(raw)) {
          classification = raw
        }
      } catch {
        // mantém 'sem_resposta' como default
      }

      // Pular conversas encerradas ou pessoais
      if (classification === 'encerrada' || classification === 'pessoal') {
        results.push({ conversationId: conv.id, action: `skipped_${classification}` })
        continue
      }

      // Gerar mensagem de follow-up
      let followUpText = ''

      if (classification === 'pendente_resposta') {
        try {
          const genRes = await getGroqClient().chat.completions.create({
            model: agent.model || 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: agent.systemPrompt +
                  '\n\nGere uma mensagem curta de follow-up (máx 2 frases) perguntando se ainda pode ajudar, baseada no contexto da conversa.',
              },
              {
                role: 'user',
                content: `Contexto:\n${history}\n\nGere o follow-up:`,
              },
            ],
            max_tokens: 150,
            temperature: 0.7,
          })
          followUpText = genRes.choices[0]?.message?.content?.trim() || ''
        } catch { /* fallback abaixo */ }
      }

      if (!followUpText) {
        const firstName = conv.lead.nome?.split(' ')[0] || ''
        followUpText = firstName
          ? `Olá, ${firstName}! Passando para ver se ainda posso te ajudar 😊`
          : 'Olá! Passando para ver se ainda posso te ajudar 😊'
      }

      // Enviar WhatsApp
      try {
        await sendMessage(instanceName, conv.whatsappChatId!, followUpText)
        results.push({ conversationId: conv.id, action: 'followup_sent' })
      } catch (err) {
        console.error('[followup] Erro ao enviar:', err)
        results.push({ conversationId: conv.id, action: 'send_error' })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      timestamp: now.toISOString(),
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno'
    console.error('[followup] Fatal:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
