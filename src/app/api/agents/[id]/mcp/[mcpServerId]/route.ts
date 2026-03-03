import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mcpServerId: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id, mcpServerId } = await params

  await prisma.agentMcpServer.deleteMany({
    where: { agentId: id, mcpServerId },
  })

  return NextResponse.json({ success: true })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mcpServerId: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id, mcpServerId } = await params

  const body = await request.json()

  const connection = await prisma.agentMcpServer.update({
    where: { agentId_mcpServerId: { agentId: id, mcpServerId } },
    data: { enabled: body.enabled ?? undefined },
    include: { mcpServer: { include: { tools: true } } },
  })

  return NextResponse.json({ success: true, data: connection })
}
