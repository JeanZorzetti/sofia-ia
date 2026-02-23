import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { name, color } = await request.json()

    const existing = await prisma.agentFolder.findFirst({
      where: { id, userId: auth.id },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const folder = await prisma.agentFolder.update({
      where: { id },
      data: {
        ...(name?.trim() && { name: name.trim() }),
        ...(color && { color }),
      },
      include: { agents: { select: { id: true } } },
    })

    return NextResponse.json(folder)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const existing = await prisma.agentFolder.findFirst({
      where: { id, userId: auth.id },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Unassign agents from folder before deleting
    await prisma.agent.updateMany({
      where: { folderId: id },
      data: { folderId: null },
    })

    await prisma.agentFolder.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
