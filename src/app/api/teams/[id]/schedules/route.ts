import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { cronFromPreset, getNextRunAt, type SchedulePreset } from '@/lib/orchestration/team/schedule'

export const dynamic = 'force-dynamic'

async function ownedTeam(teamId: string, userId: string) {
  return prisma.team.findFirst({ where: { id: teamId, createdBy: userId }, include: { members: true } })
}

// GET /api/teams/[id]/schedules — list the team's schedules.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const team = await ownedTeam(id, auth.id)
  if (!team) return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })

  const schedules = await prisma.scheduledTeamRun.findMany({
    where: { teamId: id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ success: true, data: schedules })
}

// POST /api/teams/[id]/schedules — create a schedule.
// Body: { preset: SchedulePreset, mission: string, mode?: 'chat'|'code', label?: string }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const team = await ownedTeam(id, auth.id)
  if (!team) return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
  if (!team.members.some(m => m.role === 'lead') || !team.members.some(m => m.role === 'worker')) {
    return NextResponse.json({ success: false, error: 'Roster inválido (precisa de Lead e Worker)' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const preset = body?.preset as SchedulePreset | undefined
  const mission = (body?.mission as string | undefined)?.trim()
  const mode = body?.mode === 'code' ? 'code' : 'chat'
  const label = (body?.label as string | undefined)?.trim() || null

  if (!preset || !preset.frequency) {
    return NextResponse.json({ success: false, error: 'preset é obrigatório' }, { status: 400 })
  }
  if (!mission) {
    return NextResponse.json({ success: false, error: 'mission é obrigatória' }, { status: 400 })
  }

  const cronExpr = cronFromPreset(preset)
  const nextRunAt = getNextRunAt(cronExpr)

  const schedule = await prisma.scheduledTeamRun.create({
    data: { teamId: id, userId: auth.id, cronExpr, label, mission, mode, nextRunAt, isActive: true },
  })
  return NextResponse.json({ success: true, data: schedule }, { status: 201 })
}
