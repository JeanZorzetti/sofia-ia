import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { getGroqClient } from '@/lib/ai/groq'

export const dynamic = 'force-dynamic'

/**
 * POST /api/orchestrations/generate
 * Recebe uma descrição em linguagem natural e retorna uma sugestão de orquestração
 * gerada por LLM — nome, agentes, prompts, estratégia e input de exemplo.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { description } = await request.json()
    if (!description || description.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Descreva o processo com pelo menos 10 caracteres.' },
        { status: 400 }
      )
    }

    const groq = getGroqClient()

    const systemPrompt = `Você é um especialista em orquestração de agentes IA.
Seu trabalho é receber uma descrição de processo em linguagem natural e gerar uma estrutura de orquestração multi-agente otimizada.

Regras:
- Gere entre 2 e 5 agentes especializados
- Cada agente deve ter uma função bem definida e limitada
- Use estratégia "sequential" para pipelines lineares (um agente passa para o próximo)
- Use estratégia "parallel" apenas se as tarefas forem verdadeiramente independentes
- Os prompts dos agentes devem ser claros, em português, com instruções específicas
- O último agente deve sempre consolidar ou formatar o output final

Responda APENAS com um JSON válido no seguinte formato, sem nenhum texto antes ou depois:
{
  "name": "Nome curto da orquestração (máx 50 chars)",
  "description": "Descrição do que a orquestração faz (máx 150 chars)",
  "strategy": "sequential",
  "estimatedTime": "~30s",
  "agents": [
    {
      "role": "Nome do Papel do Agente",
      "prompt": "Você é [descrição do agente]. Seu objetivo é [objetivo específico]. Receba [input esperado] e produza [output esperado]. Seja [tom/estilo]. Sempre [regra importante]."
    }
  ],
  "suggestedInput": "Exemplo de input para testar esta orquestração",
  "suggestedTags": ["tag1", "tag2"]
}`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Crie uma orquestração de agentes IA para o seguinte processo:\n\n${description.trim()}`
        }
      ],
      temperature: 0.4,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    let parsed: Record<string, unknown>

    try {
      parsed = JSON.parse(raw)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Falha ao interpretar resposta do modelo. Tente novamente.' },
        { status: 500 }
      )
    }

    // Validate minimal structure
    if (!parsed.name || !Array.isArray(parsed.agents) || parsed.agents.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Resposta incompleta do modelo. Tente ser mais específico na descrição.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: parsed })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal error'
    console.error('[orchestrations/generate POST]', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
