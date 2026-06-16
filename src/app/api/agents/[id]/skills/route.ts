import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ownerId } from '@/lib/authz'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const agent = await prisma.agent.findFirst({ where: { id, createdBy: ownerId(auth) }, select: { id: true } })
  if (!agent) return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 })

  const agentSkills = await prisma.agentSkill.findMany({
    where: { agentId: id },
    include: { skill: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ success: true, data: agentSkills })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const agent = await prisma.agent.findFirst({ where: { id, createdBy: ownerId(auth) }, select: { id: true } })
  if (!agent) return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 })

  const body = await request.json()
  const { skillId, config } = body

  if (!skillId) return NextResponse.json({ success: false, error: 'skillId is required' }, { status: 400 })

  const agentSkill = await prisma.agentSkill.upsert({
    where: { agentId_skillId: { agentId: id, skillId } },
    update: { enabled: true, config: config || {} },
    create: { agentId: id, skillId, config: config || {} },
    include: { skill: true },
  })

  return NextResponse.json({ success: true, data: agentSkill }, { status: 201 })
}
