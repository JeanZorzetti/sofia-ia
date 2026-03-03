import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { mcpClient } from '@/lib/mcp/client'

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

  // Sincronizar tools do servidor remoto
  try {
    const remoteTools = await mcpClient.listTools(server.url, server.headers as Record<string, string>)

    // Apagar tools antigas e recriar
    await prisma.mcpServerTool.deleteMany({ where: { mcpServerId: id } })
    if (remoteTools.length > 0) {
      await prisma.mcpServerTool.createMany({
        data: remoteTools.map(t => ({
          mcpServerId: id,
          name: t.name,
          description: t.description || '',
          inputSchema: t.inputSchema as object,
        })),
      })
    }
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: `Falha ao conectar ao servidor MCP: ${String(err)}`,
      cachedTools: server.tools,
    }, { status: 502 })
  }

  const updatedTools = await prisma.mcpServerTool.findMany({ where: { mcpServerId: id } })
  return NextResponse.json({ success: true, data: updatedTools })
}
