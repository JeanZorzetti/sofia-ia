import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGroqClient } from '@/lib/ai/groq'

interface AgentStep {
  agentId: string
  role: string
  prompt?: string
}

// Fallback prompts when no real orchestration is configured
const FALLBACK_TEMPLATES: Record<string, { system: string; user: (input: string) => string }> = {
  marketing: {
    system: `Você é o agente "Revisor" encerrando um Pipeline de Marketing. Responda SOMENTE no formato: Revisor: "<parecer>". Inclua: pontuação de qualidade, pontos fortes e aprovação. Máximo 2 frases. Em português.`,
    user: (input) => `O Copywriter terminou o rascunho sobre: "${input}". Dê seu parecer final.`,
  },
  suporte: {
    system: `Você é o agente "Escalação" encerrando um Pipeline de Suporte. Responda SOMENTE no formato: Escalação: "<análise>". Inclua: prioridade, ação tomada e prazo. Máximo 2 frases. Em português.`,
    user: (input) => `O Atendente finalizou a resposta para: "${input}". Dê seu parecer.`,
  },
  sequential: {
    system: `Você é o agente "Sintetizador" encerrando um Pipeline de Pesquisa. Responda SOMENTE no formato: Sintetizador: "<síntese>". Inclua: fontes, insights e confiança. Máximo 2 frases. Em português.`,
    user: (input) => `O Analista concluiu análise sobre: "${input}". Apresente a síntese final.`,
  },
}

export async function POST(request: NextRequest) {
  try {
    const { orchestrationId, category, input } = await request.json()

    if (!input || typeof input !== 'string' || !input.trim()) {
      return NextResponse.json({ error: 'Input required' }, { status: 400 })
    }

    const sanitizedInput = input.trim().slice(0, 300)
    const groq = getGroqClient()

    // --- Path A: real orchestration from DB ---
    if (orchestrationId) {
      const orchestration = await prisma.agentOrchestration.findFirst({
        where: { id: orchestrationId, isLandingTemplate: true, status: 'active' },
      })
      if (!orchestration) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }

      const agentSteps = orchestration.agents as unknown as AgentStep[]
      if (!agentSteps || agentSteps.length === 0) {
        return NextResponse.json({ error: 'No agents configured' }, { status: 400 })
      }

      const agentIds = agentSteps.map((s) => s.agentId).filter(Boolean)
      const agents = await prisma.agent.findMany({
        where: { id: { in: agentIds } },
        select: { id: true, name: true, systemPrompt: true, temperature: true },
      })
      const agentMap = new Map(agents.map((a) => [a.id, a]))

      let accumulatedContext = ''
      let finalOutput = ''

      for (const step of agentSteps) {
        const agent = agentMap.get(step.agentId)
        if (!agent) continue

        const userMsg = accumulatedContext
          ? `Contexto anterior:\n${accumulatedContext}\n\nTarefa original: ${sanitizedInput}`
          : sanitizedInput

        const systemPrompt =
          (step.prompt ? `${agent.systemPrompt}\n\n${step.prompt}` : agent.systemPrompt) +
          `\n\nIMPORTANTE: Resposta concisa (máximo 2-3 frases). Comece com "${step.role}: ".`

        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMsg },
          ],
          temperature: agent.temperature,
          max_tokens: 160,
          stream: false,
        })

        const output = completion.choices[0]?.message?.content?.trim() ?? ''
        accumulatedContext += (accumulatedContext ? '\n' : '') + output
        finalOutput = output
      }

      return NextResponse.json({ text: finalOutput })
    }

    // --- Path B: fallback Groq call (no orchestration configured) ---
    const tpl =
      FALLBACK_TEMPLATES[category ?? 'sequential'] ?? FALLBACK_TEMPLATES.sequential

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: tpl.system },
        { role: 'user', content: tpl.user(sanitizedInput) },
      ],
      temperature: 0.65,
      max_tokens: 160,
      stream: false,
    })

    const text = completion.choices[0]?.message?.content?.trim() ?? ''
    return NextResponse.json({ text })
  } catch (err) {
    console.error('[landing/template-run]', err)
    return NextResponse.json({ error: 'AI unavailable' }, { status: 500 })
  }
}
