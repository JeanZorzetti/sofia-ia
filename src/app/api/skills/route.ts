import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const skills = await prisma.skill.findMany({
    where: {
      OR: [
        { isBuiltin: true },
        { createdBy: auth.id },
      ],
    },
    orderBy: [{ isBuiltin: 'desc' }, { category: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json({ success: true, data: skills })
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, description, type, category, toolDefinition, toolCode, promptBlock } = body

  if (!name || !type) {
    return NextResponse.json({ success: false, error: 'name and type are required' }, { status: 400 })
  }

  const skill = await prisma.skill.create({
    data: {
      name,
      description,
      type,
      category: category || 'general',
      toolDefinition: toolDefinition || {},
      toolCode: toolCode || null,
      promptBlock: promptBlock || null,
      isBuiltin: false,
      createdBy: auth.id,
    },
  })

  return NextResponse.json({ success: true, data: skill }, { status: 201 })
}
