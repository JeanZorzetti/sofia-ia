// src/app/api/teams/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRoster } from '@/lib/orchestration/team/team-roster'
import { withAuth } from '@/lib/with-auth'
import { parseJson, updateTeamSchema } from '@/lib/validation'
import { clampEffort } from '@/lib/ai/model-efforts'

async function ownTeam(id: string, userId: string) {
  return prisma.team.findFirst({ where: { id, createdBy: userId } })
}

// GET /api/teams/[id]
export const GET = withAuth(async (request, auth, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params

    const team = await prisma.team.findFirst({
      where: { id, createdBy: auth.id },
      include: {
        members: { include: { agent: { select: { id: true, name: true } } }, orderBy: { position: 'asc' } },
        runs: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    })
    if (!team) return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: team })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch team'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
})

// PATCH /api/teams/[id] — update name/description/config and optionally replace roster
export const PATCH = withAuth(async (request, auth, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    const existing = await ownTeam(id, auth.id)
    if (!existing) return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })

    const parsed = await parseJson(request, updateTeamSchema)
    if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })
    const { name, description, config, members } = parsed.data

    if (members !== undefined) {
      const rosterError = validateRoster(members)
      if (rosterError) return NextResponse.json({ success: false, error: rosterError }, { status: 400 })
      const agentIds = [...new Set(members.map(m => m.agentId))]
      const agentCount = await prisma.agent.count({ where: { id: { in: agentIds } } })
      if (agentCount !== agentIds.length) {
        return NextResponse.json({ success: false, error: 'Algum agente selecionado não existe' }, { status: 400 })
      }
      await prisma.$transaction([
        prisma.teamMember.deleteMany({ where: { teamId: id } }),
        prisma.teamMember.createMany({
          data: members.map((m, i) => ({
            teamId: id, agentId: m.agentId, role: m.role,
            // S2.1: clamp effort to a tier the chosen model supports (else null), so we never
            // persist e.g. `max` on a Haiku. model=null (inherit) is permissive.
            model: m.model ?? null, effort: clampEffort(m.model ?? null, m.effort ?? null), position: m.position ?? i,
            // S1.3: persist the per-member policy; omit → SQL NULL (legacy gate).
            capabilities: m.capabilities ? (m.capabilities as object) : undefined,
            // S3.1: persist the per-member workflow; empty/omit → SQL NULL (legacy prompt).
            workflow: m.workflow?.trim() ? m.workflow.trim() : undefined,
          })),
        }),
      ])
    }

    const team = await prisma.team.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(config !== undefined
          ? { config: { ...((existing.config && typeof existing.config === 'object' ? existing.config : {}) as Record<string, unknown>), ...config } as object }
          : {}),
      },
      include: { members: { include: { agent: { select: { name: true } } }, orderBy: { position: 'asc' } } },
    })
    return NextResponse.json({ success: true, data: team })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update team'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
})

// DELETE /api/teams/[id] — archive
export const DELETE = withAuth(async (request, auth, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    if (!(await ownTeam(id, auth.id))) return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })

    await prisma.team.update({ where: { id }, data: { status: 'archived' } })
    return NextResponse.json({ success: true, data: { id, status: 'archived' } })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to archive team'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
})
