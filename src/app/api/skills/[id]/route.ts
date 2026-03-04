import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/skills/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const skill = await prisma.skill.findFirst({
    where: {
      id,
      OR: [{ isBuiltin: true }, { createdBy: auth.id }],
    },
  })

  if (!skill) return NextResponse.json({ success: false, error: 'Skill not found' }, { status: 404 })

  return NextResponse.json({ success: true, data: skill })
}

// PUT /api/skills/[id] — update user-created skill
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.skill.findFirst({
    where: { id, createdBy: auth.id, isBuiltin: false },
  })

  if (!existing) {
    return NextResponse.json({ success: false, error: 'Skill not found or cannot be edited' }, { status: 404 })
  }

  const body = await request.json()
  const { name, description, category, toolDefinition, toolCode, promptBlock } = body

  const updated = await prisma.skill.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(toolDefinition !== undefined && { toolDefinition }),
      ...(toolCode !== undefined && { toolCode }),
      ...(promptBlock !== undefined && { promptBlock }),
    },
  })

  return NextResponse.json({ success: true, data: updated })
}

// DELETE /api/skills/[id] — only user-created skills
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const skill = await prisma.skill.findFirst({
    where: { id, createdBy: auth.id, isBuiltin: false },
  })

  if (!skill) {
    return NextResponse.json(
      { success: false, error: 'Skill not found or cannot be deleted (built-in skills are protected)' },
      { status: 404 }
    )
  }

  await prisma.skill.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
