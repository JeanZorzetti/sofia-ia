// src/app/api/teams/templates/[id]/deploy/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { getTeamTemplateById } from '@/lib/orchestration/team/team-templates'
import { instantiateRoster } from '@/lib/orchestration/team/instantiate-roster'

export const dynamic = 'force-dynamic'

/**
 * POST /api/teams/templates/[id]/deploy
 * Instantiates a static template into Agents + Team for the current user.
 * Returns: { teamId, team: { id, name, description, members } }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const tpl = getTeamTemplateById(id)
  if (!tpl) return NextResponse.json({ success: false, error: 'Template não encontrado' }, { status: 404 })

  try {
    const result = await instantiateRoster({
      name: tpl.name,
      description: tpl.description,
      teamConfig: { createdFromTemplate: tpl.id },
      members: tpl.members,
      userId: auth.id,
      agentDescription: `Criado a partir do template "${tpl.name}"`,
      agentConfigExtra: { createdFromTemplate: tpl.id },
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
          members: tpl.members.map(m => ({ role: m.role, name: m.name })),
        },
      },
    })
  } catch (error) {
    console.error('Template deploy error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao criar o time a partir do template.' }, { status: 500 })
  }
}
