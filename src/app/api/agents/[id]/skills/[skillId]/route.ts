import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ownerId } from '@/lib/authz'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; skillId: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id, skillId } = await params

  const agent = await prisma.agent.findFirst({ where: { id, createdBy: ownerId(auth) }, select: { id: true } })
  if (!agent) return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 })

  await prisma.agentSkill.deleteMany({
    where: { agentId: id, skillId },
  })

  return NextResponse.json({ success: true })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; skillId: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id, skillId } = await params

  const agent = await prisma.agent.findFirst({ where: { id, createdBy: ownerId(auth) }, select: { id: true } })
  if (!agent) return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 })

  const body = await request.json()

  const agentSkill = await prisma.agentSkill.update({
    where: { agentId_skillId: { agentId: id, skillId } },
    data: {
      enabled: body.enabled ?? undefined,
      config: body.config ?? undefined,
    },
    include: { skill: true },
  })

  return NextResponse.json({ success: true, data: agentSkill })
}
