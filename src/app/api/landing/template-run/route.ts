import { NextRequest, NextResponse } from 'next/server'
import { getGroqClient } from '@/lib/ai/groq'

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
    const { category, input } = await request.json()

    if (!input || typeof input !== 'string' || !input.trim()) {
      return NextResponse.json({ error: 'Input required' }, { status: 400 })
    }

    const sanitizedInput = input.trim().slice(0, 300)
    const groq = getGroqClient()

    // --- Fallback Groq call (self-contained demo, no orchestration engine) ---
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
