/**
 * POST /api/threads/campaigns/[id]/plan
 *
 * Phase 1 (Teams subordination): "Planejar com IA" for a Threads campaign.
 * On first call, instantiates a dedicated content Team (template `threads-campaign`)
 * and binds it to the campaign (campaign.teamId); on subsequent calls reuses it.
 * Then starts a chat run with the campaign brief as the mission and ingests the
 * run output into campaign posts via the startTeamRun onComplete hook.
 * The coordinator (runTeam) stays INTACT — this is a caller.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTeamTemplateById } from '@/lib/orchestration/team/team-templates'
import { instantiateRoster } from '@/lib/orchestration/team/instantiate-roster'
import { startTeamRun, TeamRunError } from '@/lib/orchestration/team/start-team-run'
import { ingestCampaignRun } from '@/lib/threads/campaign-ingest'

interface RouteParams {
  params: Promise<{ id: string }>
}

const OBJECTIVE_LABELS: Record<string, string> = {
  awareness: 'Awareness (alcance/reconhecimento)',
  leads: 'Geração de leads',
  activation: 'Ativação',
  retention: 'Retenção',
  engagement: 'Engajamento',
}

function buildMission(c: {
  name: string
  objective: string
  theme: string
  description: string | null
  startDate: Date
  endDate: Date
}): string {
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return [
    'Planeje uma campanha de conteúdo para o Threads (rede social da Meta).',
    '',
    `Nome da campanha: ${c.name}`,
    `Objetivo: ${OBJECTIVE_LABELS[c.objective] ?? c.objective}`,
    `Tema central: ${c.theme}`,
    c.description ? `Contexto adicional: ${c.description}` : '',
    `Período: ${fmt(c.startDate)} a ${fmt(c.endDate)}`,
    '',
    'Entregue de 5 a 7 posts em sequência, com arco narrativo, cada um com tema, angle e o texto final (máximo 500 caracteres).',
    'Lembre: a consolidação final deve ser APENAS o array JSON [{ "tema", "angle", "content" }], dentro de um bloco ```json.',
  ].filter(Boolean).join('\n')
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params

    const campaign = await prisma.threadsCampaign.findUnique({ where: { id } })
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    if (campaign.userId !== auth.id) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    // Resolve (or create) the content Team bound to this campaign.
    let teamId = campaign.teamId
    if (!teamId) {
      const template = getTeamTemplateById('threads-campaign')
      if (!template) {
        return NextResponse.json({ error: 'Template de campanha indisponível' }, { status: 500 })
      }
      const result = await instantiateRoster({
        name: `Campanha: ${campaign.name}`,
        description: `Time de conteúdo da campanha Threads "${campaign.name}"`,
        members: template.members,
        userId: auth.id,
        agentDescription: `Agente do time de campanha Threads "${campaign.name}"`,
      })
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 422 })
      }
      teamId = result.team.id
      await prisma.threadsCampaign.update({ where: { id }, data: { teamId } })
    }

    const mission = buildMission(campaign)

    const run = await startTeamRun(teamId, {
      mission,
      mode: 'chat',
      userId: auth.id,
      onComplete: async (runId) => { await ingestCampaignRun(campaign.id, runId) },
    })

    return NextResponse.json({
      success: true,
      data: { teamId, runId: run.runId },
    })
  } catch (error) {
    if (error instanceof TeamRunError) {
      const status = error.code === 'not_found' ? 404 : error.code === 'queue_unavailable' ? 503 : 400
      return NextResponse.json({ error: error.message }, { status })
    }
    console.error('Error planning campaign:', error)
    return NextResponse.json({ error: 'Erro ao planejar campanha' }, { status: 500 })
  }
}
