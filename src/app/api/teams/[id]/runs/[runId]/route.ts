// src/app/api/teams/[id]/runs/[runId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

async function ownRun(teamId: string, runId: string, userId: string) {
  return prisma.teamRun.findFirst({ where: { id: runId, teamId, team: { createdBy: userId } } })
}

// GET /api/teams/[id]/runs/[runId] — board + messages + output
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; runId: string }> }) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const { id, runId } = await params

    const run = await prisma.teamRun.findFirst({
      where: { id: runId, teamId: id, team: { createdBy: auth.id } },
      include: { tasks: { orderBy: { position: 'asc' } }, messages: { orderBy: { createdAt: 'asc' } } },
    })
    if (!run) return NextResponse.json({ success: false, error: 'Run not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: run })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch run'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// DELETE /api/teams/[id]/runs/[runId] — cancel a running run
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; runId: string }> }) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const { id, runId } = await params

    const run = await ownRun(id, runId, auth.id)
    if (!run) return NextResponse.json({ success: false, error: 'Run not found' }, { status: 404 })
    if (run.status !== 'running' && run.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Run não está em andamento' }, { status: 400 })
    }

    await prisma.teamRun.update({
      where: { id: runId },
      data: { status: 'cancelled', completedAt: new Date(), error: 'Cancelado pelo usuário' },
    })
    return NextResponse.json({ success: true, data: { id: runId, status: 'cancelled' } })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to cancel run'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
