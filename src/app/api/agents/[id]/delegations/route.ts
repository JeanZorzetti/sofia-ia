import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/agents/[id]/delegations — histórico de delegações do agente
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params

    const agent = await prisma.agent.findUnique({
      where: { id },
      select: { id: true, createdBy: true, name: true },
    })

    if (!agent) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })
    if (agent.createdBy !== auth.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const direction = searchParams.get('direction') || 'both' // sent | received | both

    const whereFrom = direction !== 'received' ? { fromAgentId: id } : undefined
    const whereTo = direction !== 'sent' ? { toAgentId: id } : undefined

    const [sent, received] = await Promise.all([
      whereFrom
        ? prisma.agentDelegation.findMany({
            where: whereFrom,
            include: {
              toAgent: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
          })
        : [],
      whereTo
        ? prisma.agentDelegation.findMany({
            where: whereTo,
            include: {
              fromAgent: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
          })
        : [],
    ])

    return NextResponse.json({
      success: true,
      data: {
        agent: { id: agent.id, name: agent.name },
        sent,
        received,
      },
    })
  } catch (error) {
    console.error('Error fetching delegations:', error)
    return NextResponse.json({ error: 'Erro ao buscar delegações' }, { status: 500 })
  }
}
