import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { cronFromPreset, getNextRunAt, type SchedulePreset } from '@/lib/orchestration/team/schedule'

export const dynamic = 'force-dynamic'

// Returns the schedule only if the parent team belongs to the user.
async function ownedSchedule(teamId: string, scheduleId: string, userId: string) {
  const team = await prisma.team.findFirst({ where: { id: teamId, createdBy: userId } })
  if (!team) return null
  return prisma.scheduledTeamRun.findFirst({ where: { id: scheduleId, teamId } })
}

// PATCH /api/teams/[id]/schedules/[scheduleId] — toggle isActive and/or edit fields.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> },
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id, scheduleId } = await params
  const existing = await ownedSchedule(id, scheduleId, auth.id)
  if (!existing) return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (typeof body?.isActive === 'boolean') data.isActive = body.isActive
  if (typeof body?.label === 'string') data.label = body.label.trim() || null
  if (typeof body?.mission === 'string' && body.mission.trim()) data.mission = body.mission.trim()
  if (body?.mode === 'chat' || body?.mode === 'code') data.mode = body.mode
  if (body?.preset && (body.preset as SchedulePreset).frequency) {
    const cronExpr = cronFromPreset(body.preset as SchedulePreset)
    data.cronExpr = cronExpr
    data.nextRunAt = getNextRunAt(cronExpr)
  }

  const updated = await prisma.scheduledTeamRun.update({ where: { id: scheduleId }, data })
  return NextResponse.json({ success: true, data: updated })
}

// DELETE /api/teams/[id]/schedules/[scheduleId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> },
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id, scheduleId } = await params
  const existing = await ownedSchedule(id, scheduleId, auth.id)
  if (!existing) return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 })

  await prisma.scheduledTeamRun.delete({ where: { id: scheduleId } })
  return NextResponse.json({ success: true })
}
