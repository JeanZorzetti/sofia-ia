/**
 * POST /api/agents/[id]/cognitive-mode
 * Habilita ou desabilita o Cognitive Pipeline (3-stage LLM) no agente.
 *
 * Body: { enabled: boolean }
 *
 * Quando enabled=true, cada mensagem passa por:
 *   1. Cognitive Orchestrator → perfil psicológico + estratégia (JSON)
 *   2. Strategy Optimizer → diretrizes concretas de comunicação
 *   3. Response Synthesizer → resposta final com guidance estratégico
 *
 * Nota: aumenta latência (~3x chamadas LLM). Use só em agentes comerciais.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const enabled: boolean = body.enabled !== false

  const agent = await prisma.agent.findUnique({ where: { id }, select: { id: true, config: true } })
  if (!agent) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })

  const currentConfig = (agent.config || {}) as Record<string, unknown>

  await prisma.agent.update({
    where: { id },
    data: { config: { ...currentConfig, cognitiveMode: enabled } },
  })

  return NextResponse.json({ success: true, cognitiveMode: enabled })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const agent = await prisma.agent.findUnique({ where: { id }, select: { config: true } })
  if (!agent) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })

  const config = (agent.config || {}) as Record<string, unknown>
  return NextResponse.json({ cognitiveMode: !!config.cognitiveMode })
}
