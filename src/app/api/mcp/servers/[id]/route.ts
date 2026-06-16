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

  const server = await prisma.mcpServer.findFirst({
    where: { id, createdBy: auth.id },
    include: { tools: true },
  })

  if (!server) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true, data: server })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const owned = await prisma.mcpServer.findFirst({
    where: { id, createdBy: ownerId(auth) },
    select: { id: true },
  })
  if (!owned) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  const body = await request.json()

  const server = await prisma.mcpServer.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      description: body.description ?? undefined,
      url: body.url ?? undefined,
      headers: body.headers ?? undefined,
      status: body.status ?? undefined,
    },
    include: { tools: true },
  })

  return NextResponse.json({ success: true, data: server })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const { count } = await prisma.mcpServer.deleteMany({ where: { id, createdBy: ownerId(auth) } })
  if (count === 0) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
