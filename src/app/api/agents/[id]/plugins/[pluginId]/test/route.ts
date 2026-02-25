import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { executePlugin } from '@/lib/plugins/executor'

interface RouteParams {
  params: Promise<{ id: string; pluginId: string }>
}

// POST /api/agents/[id]/plugins/[pluginId]/test — testar plugin com input JSON
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id, pluginId } = await params

    const plugin = await prisma.agentPlugin.findFirst({
      where: { id: pluginId, agentId: id },
      include: { agent: { select: { createdBy: true } } },
    })

    if (!plugin) return NextResponse.json({ error: 'Plugin não encontrado' }, { status: 404 })
    if (plugin.agent.createdBy !== auth.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const input = body.input ?? {}

    const result = await executePlugin(plugin.code, input)

    return NextResponse.json({
      success: true,
      data: {
        pluginId,
        name: plugin.name,
        input,
        result,
        executedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error testing plugin:', error)
    return NextResponse.json({ error: 'Erro ao testar plugin' }, { status: 500 })
  }
}
