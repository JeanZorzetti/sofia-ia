import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { getGroqClient } from '@/lib/ai/groq'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const MAGIC_SYSTEM_PROMPT = `Você é um especialista em criar orquestrações de agentes IA.
Dado um processo descrito em linguagem natural, crie uma orquestração completa.

Retorne um JSON válido com esta estrutura (sem markdown, sem texto extra, APENAS o JSON):
{
  "name": "Nome da orquestração",
  "description": "Descrição breve",
  "agents": [
    {
      "name": "Nome do Agente",
      "role": "papel deste agente",
      "systemPrompt": "Você é um [papel]. Sua tarefa é [tarefa específica]. Receba [input] e produza [output]. Seja [tom]. Sempre [regra].",
      "model": "llama-3.3-70b-versatile",
      "position": { "x": 100, "y": 100 }
    }
  ],
  "connections": [
    { "from": 0, "to": 1, "label": "passa resultado" }
  ]
}

Regras:
- Use 2 a 5 agentes
- Cada agente deve ter um papel claro e único
- Os system prompts devem ser específicos e detalhados (100-200 palavras cada)
- As connections usam índices dos agentes (0-based)
- Escreva sempre em português brasileiro
- Posições: primeiro agente em x:100, y:200; incrementa x:300 por agente`

/**
 * POST /api/orchestrations/magic-create
 * Gera e salva automaticamente uma orquestração completa usando LLM
 * Body: { description: string }
 * Returns: { orchestrationId, orchestration: { name, agents, connections } }
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: { description?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Body JSON inválido' }, { status: 400 })
  }

  const { description } = body
  if (!description || description.trim().length < 10) {
    return NextResponse.json(
      { success: false, error: 'Descreva o processo com pelo menos 10 caracteres.' },
      { status: 400 }
    )
  }

  try {
    const groq = getGroqClient()

    // Gera a orquestração via LLM
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: MAGIC_SYSTEM_PROMPT },
        { role: 'user', content: `Crie uma orquestração para o seguinte processo:\n\n${description.trim()}` },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    })

    const rawContent = completion.choices[0]?.message?.content || ''

    // Extrai o JSON da resposta
    let orchestrationData: {
      name: string
      description: string
      agents: Array<{
        name: string
        role: string
        systemPrompt: string
        model: string
        position: { x: number; y: number }
      }>
      connections: Array<{ from: number; to: number; label: string }>
    }

    try {
      // Remove possíveis markdown code blocks
      const jsonStr = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      orchestrationData = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error('Failed to parse LLM JSON:', rawContent)
      return NextResponse.json(
        { success: false, error: 'O modelo retornou um JSON inválido. Tente novamente.' },
        { status: 422 }
      )
    }

    // Valida campos obrigatórios
    if (!orchestrationData.name || !Array.isArray(orchestrationData.agents) || orchestrationData.agents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Estrutura da orquestração inválida. Tente novamente.' },
        { status: 422 }
      )
    }

    // Salva agentes no banco
    const createdAgentIds: string[] = []
    for (const agentDef of orchestrationData.agents) {
      const agent = await prisma.agent.create({
        data: {
          name: agentDef.name || agentDef.role || 'Agente',
          description: `Criado automaticamente via Magic Create para "${orchestrationData.name}"`,
          systemPrompt: agentDef.systemPrompt || `Você é ${agentDef.role}.`,
          model: agentDef.model || 'llama-3.3-70b-versatile',
          temperature: 0.7,
          status: 'active',
          createdBy: auth.id,
          config: {
            role: agentDef.role,
            position: agentDef.position || { x: 100, y: 200 },
            createdByMagic: true,
          },
        },
      })
      createdAgentIds.push(agent.id)
    }

    // Monta agentSteps para a orquestração
    const agentSteps = orchestrationData.agents.map((a, i) => ({
      agentId: createdAgentIds[i],
      role: a.role,
      name: a.name,
      order: i,
    }))

    // Salva a orquestração no banco
    const orchestration = await prisma.agentOrchestration.create({
      data: {
        name: orchestrationData.name,
        description: orchestrationData.description || description.trim().slice(0, 200),
        agents: agentSteps,
        strategy: 'sequential',
        status: 'active',
        createdBy: auth.id,
        config: {
          connections: orchestrationData.connections || [],
          createdByMagic: true,
          originalDescription: description.trim(),
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        orchestrationId: orchestration.id,
        orchestration: {
          id: orchestration.id,
          name: orchestration.name,
          description: orchestration.description,
          agents: orchestrationData.agents.map((a, i) => ({
            ...a,
            id: createdAgentIds[i],
          })),
          connections: orchestrationData.connections || [],
        },
      },
    })
  } catch (error) {
    console.error('Magic create error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar orquestração. Tente novamente.' },
      { status: 500 }
    )
  }
}
