import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const folders = await prisma.agentFolder.findMany({
      where: { userId: auth.id },
      orderBy: { createdAt: 'asc' },
      include: { agents: { select: { id: true } } },
    })

    return NextResponse.json(folders)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, color } = await request.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const folder = await prisma.agentFolder.create({
      data: {
        name: name.trim(),
        color: color || '#3b82f6',
        userId: auth.id,
      },
      include: { agents: { select: { id: true } } },
    })

    return NextResponse.json(folder, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
