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

  const connections = await prisma.agentMcpServer.findMany({
    where: { agentId: id },
    include: { mcpServer: { include: { tools: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ success: true, data: connections })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const body = await request.json()
  const { mcpServerId } = body

  if (!mcpServerId) {
    return NextResponse.json({ success: false, error: 'mcpServerId is required' }, { status: 400 })
  }

  const connection = await prisma.agentMcpServer.upsert({
    where: { agentId_mcpServerId: { agentId: id, mcpServerId } },
    update: { enabled: true },
    create: { agentId: id, mcpServerId, enabled: true },
    include: { mcpServer: { include: { tools: true } } },
  })

  return NextResponse.json({ success: true, data: connection }, { status: 201 })
}
