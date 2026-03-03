import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { mcpClient } from '@/lib/mcp/client'

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const servers = await prisma.mcpServer.findMany({
    where: { createdBy: auth.id },
    include: { tools: true, _count: { select: { agentMcpServers: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: servers })
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, description, url, transport, headers } = body

  if (!name || !url) {
    return NextResponse.json({ success: false, error: 'name and url are required' }, { status: 400 })
  }

  const server = await prisma.mcpServer.create({
    data: {
      name,
      description,
      url,
      transport: transport || 'http',
      headers: headers || {},
      createdBy: auth.id,
    },
  })

  // Tentar sincronizar tools automaticamente
  try {
    const tools = await mcpClient.listTools(url, headers || {})
    if (tools.length > 0) {
      await prisma.mcpServerTool.createMany({
        data: tools.map(t => ({
          mcpServerId: server.id,
          name: t.name,
          description: t.description || '',
          inputSchema: t.inputSchema,
        })),
      })
    }
  } catch {
    // Servidor pode estar offline; tools podem ser sincronizadas depois
  }

  const serverWithTools = await prisma.mcpServer.findUnique({
    where: { id: server.id },
    include: { tools: true },
  })

  return NextResponse.json({ success: true, data: serverWithTools }, { status: 201 })
}
