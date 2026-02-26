import { NextRequest, NextResponse } from 'next/server'
import { getGroqClient } from '@/lib/ai/groq'

const TEMPLATES: Record<string, { system: string; user: (input: string) => string }> = {
  marketing: {
    system: `Você é o agente "Revisor" encerrando um Pipeline de Marketing.
Sua tarefa é dar o parecer final sobre um post que passou por Pesquisador e Copywriter.
Responda EXATAMENTE neste formato (uma única linha):
Revisor: "<seu parecer aqui>"
O parecer deve incluir: pontuação de qualidade, pontos fortes e aprovação. Máximo 2 frases curtas. Em português brasileiro. Sem quebras de linha.`,
    user: (input) => `O Copywriter terminou o rascunho sobre: "${input}". Dê seu parecer final de revisão.`,
  },
  suporte: {
    system: `Você é o agente "Escalação" encerrando um Pipeline de Triagem de Suporte.
Sua tarefa é dar o parecer final sobre um ticket que passou por Triagem e Atendente.
Responda EXATAMENTE neste formato (uma única linha):
Escalação: "<seu parecer aqui>"
O parecer deve incluir: prioridade definida, ação tomada e prazo estimado. Máximo 2 frases curtas. Em português brasileiro. Sem quebras de linha.`,
    user: (input) => `O Atendente finalizou a resposta para o problema: "${input}". Dê seu parecer final de escalação.`,
  },
  pesquisa: {
    system: `Você é o agente "Sintetizador" encerrando um Pipeline de Pesquisa & Síntese.
Sua tarefa é apresentar a síntese final de uma pesquisa que passou por Coletor e Analista.
Responda EXATAMENTE neste formato (uma única linha):
Sintetizador: "<sua síntese aqui>"
A síntese deve incluir: número de fontes verificadas, principais insights e score de confiança. Máximo 2 frases curtas. Em português brasileiro. Sem quebras de linha.`,
    user: (input) => `O Analista concluiu a análise sobre: "${input}". Apresente a síntese final.`,
  },
}

export async function POST(request: NextRequest) {
  try {
    const { category, input } = await request.json()

    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return NextResponse.json({ error: 'Input required' }, { status: 400 })
    }

    const tpl = TEMPLATES[category] ?? TEMPLATES.pesquisa
    const sanitizedInput = input.trim().slice(0, 200)

    const completion = await getGroqClient().chat.completions.create({
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
    console.error('[template-run]', err)
    return NextResponse.json({ error: 'AI unavailable' }, { status: 500 })
  }
}
