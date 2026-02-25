import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validatePluginCode } from '@/lib/plugins/executor'
import { logAudit } from '@/lib/audit'

interface RouteParams {
  params: Promise<{ id: string; pluginId: string }>
}

async function verifyAccess(agentId: string, pluginId: string, userId: string) {
  const plugin = await prisma.agentPlugin.findFirst({
    where: { id: pluginId, agentId },
    include: { agent: { select: { createdBy: true } } },
  })
  if (!plugin) return null
  if (plugin.agent.createdBy !== userId) return null
  return plugin
}

// PATCH /api/agents/[id]/plugins/[pluginId] — editar plugin
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id, pluginId } = await params

    const plugin = await verifyAccess(id, pluginId, auth.id)
    if (!plugin) return NextResponse.json({ error: 'Plugin não encontrado' }, { status: 404 })

    const body = await request.json()
    const { name, description, code, inputSchema, enabled } = body

    // Validar código se fornecido
    if (code) {
      const validation = validatePluginCode(code)
      if (!validation.valid) {
        return NextResponse.json(
          { error: `Erro de sintaxe no código: ${validation.error}` },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.agentPlugin.update({
      where: { id: pluginId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(code !== undefined && { code }),
        ...(inputSchema !== undefined && { inputSchema }),
        ...(enabled !== undefined && { enabled }),
      },
    })

    logAudit(auth.id, 'plugin.updated', 'agent_plugin', pluginId, { agentId: id })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating plugin:', error)
    return NextResponse.json({ error: 'Erro ao atualizar plugin' }, { status: 500 })
  }
}

// DELETE /api/agents/[id]/plugins/[pluginId] — remover plugin
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id, pluginId } = await params

    const plugin = await verifyAccess(id, pluginId, auth.id)
    if (!plugin) return NextResponse.json({ error: 'Plugin não encontrado' }, { status: 404 })

    await prisma.agentPlugin.delete({ where: { id: pluginId } })

    logAudit(auth.id, 'plugin.deleted', 'agent_plugin', pluginId, { agentId: id })

    return NextResponse.json({ success: true, message: 'Plugin removido com sucesso' })
  } catch (error) {
    console.error('Error deleting plugin:', error)
    return NextResponse.json({ error: 'Erro ao remover plugin' }, { status: 500 })
  }
}
