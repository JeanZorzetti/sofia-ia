import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validatePluginCode } from '@/lib/plugins/executor'
import { logAudit } from '@/lib/audit'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/agents/[id]/plugins — listar plugins do agente
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params

    const agent = await prisma.agent.findUnique({
      where: { id },
      select: { id: true, createdBy: true },
    })

    if (!agent) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })
    if (agent.createdBy !== auth.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const plugins = await prisma.agentPlugin.findMany({
      where: { agentId: id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ success: true, data: plugins })
  } catch (error) {
    console.error('Error fetching plugins:', error)
    return NextResponse.json({ error: 'Erro ao buscar plugins' }, { status: 500 })
  }
}

// POST /api/agents/[id]/plugins — criar plugin
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params

    const agent = await prisma.agent.findUnique({
      where: { id },
      select: { id: true, createdBy: true },
    })

    if (!agent) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })
    if (agent.createdBy !== auth.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Verificar limite por plano
    const existingCount = await prisma.agentPlugin.count({ where: { agentId: id } })

    // Buscar plano do usuário
    const sub = await prisma.subscription.findUnique({
      where: { userId: auth.id },
      select: { plan: true, status: true },
    })
    const plan = sub?.status === 'active' ? (sub?.plan ?? 'free') : 'free'
    const limits: Record<string, number> = { free: 2, pro: 10, business: 999 }
    const limit = limits[plan] ?? 2

    if (existingCount >= limit) {
      return NextResponse.json(
        {
          error: `Limite de plugins atingido para o plano ${plan} (máx ${limit}). Faça upgrade para adicionar mais.`,
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, description, code, inputSchema, enabled } = body

    if (!name || !code) {
      return NextResponse.json({ error: 'Nome e código são obrigatórios' }, { status: 400 })
    }

    // Validar sintaxe do código
    const validation = validatePluginCode(code)
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Erro de sintaxe no código do plugin: ${validation.error}` },
        { status: 400 }
      )
    }

    const plugin = await prisma.agentPlugin.create({
      data: {
        agentId: id,
        name,
        description: description || null,
        code,
        inputSchema: inputSchema || '{}',
        enabled: enabled !== undefined ? enabled : true,
      },
    })

    logAudit(auth.id, 'plugin.created', 'agent_plugin', plugin.id, { agentId: id, name })

    return NextResponse.json({ success: true, data: plugin }, { status: 201 })
  } catch (error) {
    console.error('Error creating plugin:', error)
    return NextResponse.json({ error: 'Erro ao criar plugin' }, { status: 500 })
  }
}
