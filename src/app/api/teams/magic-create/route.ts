// src/app/api/teams/magic-create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { getGroqClient } from '@/lib/ai/groq'
import { parseMagicRoster } from '@/lib/orchestration/team/magic-roster'
import { instantiateRoster } from '@/lib/orchestration/team/instantiate-roster'

export const dynamic = 'force-dynamic'

const MAGIC_TEAM_SYSTEM_PROMPT = `Você é um especialista em montar TIMES de agentes IA que coordenam, executam e revisam tarefas juntos.
Dado um processo descrito em linguagem natural, monte o time completo.

Retorne um JSON válido com esta estrutura (sem markdown, sem texto extra, APENAS o JSON):
{
  "name": "Nome do time",
  "description": "Descrição breve",
  "members": [
    { "role": "lead",   "name": "Coordenador", "systemPrompt": "...", "model": "llama-3.3-70b-versatile" },
    { "role": "worker", "name": "Pesquisador", "systemPrompt": "...", "model": "llama-3.3-70b-versatile" }
  ]
}

Regras OBRIGATÓRIAS:
- Exatamente 1 membro com role "lead" (coordena e delega o trabalho do time).
- 1 ou mais membros com role "worker" — cada etapa do processo vira um worker.
- Inclua um membro com role "reviewer" SOMENTE se o processo descrito implicar QA, revisão ou aprovação de qualidade. Caso contrário, NÃO inclua reviewer.
- No máximo 1 reviewer.
- Cada systemPrompt deve ser específico e detalhado (100-200 palavras): descreva o papel, a tarefa, o input esperado e o output produzido.
- model sempre "llama-3.3-70b-versatile".
- Escreva tudo em português brasileiro.`

/**
 * POST /api/teams/magic-create
 * NL → Groq gera um roster (1 Lead + N Workers + Reviewer-se-implicar) → cria Agents + Team.
 * Body: { description: string }
 * Returns: { teamId, team: { id, name, description, members } }
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

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
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: MAGIC_TEAM_SYSTEM_PROMPT },
        { role: 'user', content: `Crie um time para o seguinte processo:\n\n${description.trim()}` },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    })

    const rawContent = completion.choices[0]?.message?.content || ''

    const parsed = parseMagicRoster(rawContent)
    if (!parsed.ok) {
      console.error('Magic create (team) parse failed:', rawContent)
      return NextResponse.json({ success: false, error: parsed.error }, { status: 422 })
    }

    const result = await instantiateRoster({
      name: parsed.roster.name,
      description: parsed.roster.description || description.trim().slice(0, 200),
      teamConfig: { createdByMagic: true, originalDescription: description.trim() },
      members: parsed.roster.members,
      userId: auth.id,
      agentDescription: `Criado automaticamente via Magic Create para "${parsed.roster.name}"`,
      agentConfigExtra: { createdByMagic: true },
    })
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 422 })
    }

    return NextResponse.json({
      success: true,
      data: {
        teamId: result.team.id,
        team: {
          id: result.team.id,
          name: result.team.name,
          description: result.team.description,
          members: parsed.roster.members,
        },
      },
    })
  } catch (error) {
    console.error('Magic create (team) error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar o time. Tente novamente.' },
      { status: 500 }
    )
  }
}
