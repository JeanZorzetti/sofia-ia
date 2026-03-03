import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

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
