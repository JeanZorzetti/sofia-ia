import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  countByKey,
  responseTimeByAgent,
  avgOrZero,
  rate,
  round2,
} from '@/lib/analytics/aggregate';

interface PeriodFilter {
  startDate: Date;
  endDate: Date;
}

/**
 * Parse período do query param
 */
function parsePeriod(period: string | null, startDate?: string, endDate?: string): PeriodFilter {
  const now = new Date();
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  if (period === 'custom' && startDate && endDate) {
    return {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    };
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case '7d':
      start.setDate(now.getDate() - 7);
      break;
    case '30d':
      start.setDate(now.getDate() - 30);
      break;
    case '90d':
      start.setDate(now.getDate() - 90);
      break;
    case 'today':
      break;
    default:
      start.setDate(now.getDate() - 7);
  }

  return { startDate: start, endDate: end };
}

/**
 * GET /api/analytics/agents
 *
 * Retorna métricas detalhadas por agente
 *
 * Query params:
 * - period: 7d | 30d | 90d | today | custom (default: 7d)
 * - startDate: data início no formato YYYY-MM-DD (para period=custom)
 * - endDate: data fim no formato YYYY-MM-DD (para period=custom)
 * - agentId: filtrar por agente específico (opcional)
 *
 * Performance (Sprint 2): antes este handler rodava 6 queries POR agente
 * (N+1). Agora roda um número fixo de queries em lote (`groupBy`/`findMany` com
 * `where: { ... in [...] }`) e agrega em memória — independentemente do nº de
 * agentes.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const agentIdParam = searchParams.get('agentId');

    const { startDate, endDate } = parsePeriod(period, startDateParam || undefined, endDateParam || undefined);

    // Buscar todos os agentes (escopo do relatório)
    const agents = await prisma.agent.findMany({
      where: agentIdParam ? { id: agentIdParam } : {},
      include: {
        channels: true,
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const agentIds = agents.map((a) => a.id);

    // Sem agentes → resposta vazia consistente (evita queries com `in: []`).
    if (agentIds.length === 0) {
      return NextResponse.json({
        success: true,
        period: { startDate: startDate.toISOString(), endDate: endDate.toISOString(), label: period || '7d' },
        totals: { conversations: 0, conversationsCompleted: 0, aiMessages: 0, takeovers: 0 },
        agents: [],
      });
    }

    // ---- Queries em lote (todas escopadas por `agentId in [...]`) ----
    const [
      startedGroups,
      completedGroups,
      activeGroups,
      takeoverGroups,
      aiMessageGroups,
      timingConversations,
    ] = await Promise.all([
      // Conversas iniciadas no período
      prisma.conversation.groupBy({
        by: ['agentId'],
        where: { agentId: { in: agentIds }, startedAt: { gte: startDate, lte: endDate } },
        _count: { _all: true },
      }),
      // Conversas encerradas com sucesso no período
      prisma.conversation.groupBy({
        by: ['agentId'],
        where: { agentId: { in: agentIds }, closedAt: { gte: startDate, lte: endDate }, status: 'closed' },
        _count: { _all: true },
      }),
      // Conversas ativas agora (sem filtro de período)
      prisma.conversation.groupBy({
        by: ['agentId'],
        where: { agentId: { in: agentIds }, status: 'active' },
        _count: { _all: true },
      }),
      // Takeovers (assumidas por humano) no período
      prisma.conversation.groupBy({
        by: ['agentId'],
        where: { agentId: { in: agentIds }, handledBy: 'human', startedAt: { gte: startDate, lte: endDate } },
        _count: { _all: true },
      }),
      // Mensagens geradas por IA no período, agrupadas por conversa
      // (Message não tem agentId; mapeamos via conversa abaixo).
      prisma.message.groupBy({
        by: ['conversationId'],
        where: {
          isAiGenerated: true,
          sentAt: { gte: startDate, lte: endDate },
          conversation: { agentId: { in: agentIds } },
        },
        _count: { _all: true },
      }),
      // Conversas com mensagens no período → tempo médio de resposta
      prisma.conversation.findMany({
        where: { agentId: { in: agentIds }, lastMessageAt: { gte: startDate, lte: endDate } },
        select: {
          agentId: true,
          messages: {
            where: { sentAt: { gte: startDate, lte: endDate } },
            orderBy: { sentAt: 'asc' },
            select: { sender: true, sentAt: true },
          },
        },
      }),
    ]);

    // Mapear conversationId → agentId para somar as mensagens de IA por agente.
    const aiConvIds = aiMessageGroups.map((g) => g.conversationId);
    const convAgent = aiConvIds.length
      ? await prisma.conversation.findMany({
          where: { id: { in: aiConvIds } },
          select: { id: true, agentId: true },
        })
      : [];
    const convToAgent = new Map(convAgent.map((c) => [c.id, c.agentId]));

    const startedByAgent = countByKey(startedGroups, 'agentId');
    const completedByAgent = countByKey(completedGroups, 'agentId');
    const activeByAgent = countByKey(activeGroups, 'agentId');
    const takeoverByAgent = countByKey(takeoverGroups, 'agentId');

    const aiByAgent = new Map<string, number>();
    for (const g of aiMessageGroups) {
      const agentId = convToAgent.get(g.conversationId);
      if (!agentId) continue;
      aiByAgent.set(agentId, (aiByAgent.get(agentId) ?? 0) + g._count._all);
    }

    const responseTime = responseTimeByAgent(timingConversations);

    // Montar métricas por agente (mesma forma de resposta de antes).
    const agentMetrics = agents.map((agent) => {
      const conversations = startedByAgent.get(agent.id) ?? 0;
      const conversationsCompleted = completedByAgent.get(agent.id) ?? 0;
      const activeConversations = activeByAgent.get(agent.id) ?? 0;
      const takeovers = takeoverByAgent.get(agent.id) ?? 0;
      const aiMessages = aiByAgent.get(agent.id) ?? 0;
      const avgResponseTime = avgOrZero(responseTime.get(agent.id));

      return {
        agent: {
          id: agent.id,
          name: agent.name,
          description: agent.description,
          status: agent.status,
          model: agent.model,
          channels: agent.channels.map((ch) => ({
            channel: ch.channel,
            isActive: ch.isActive,
          })),
          createdBy: agent.creator.name,
        },
        metrics: {
          conversations,
          conversationsCompleted,
          conversationsActive: activeConversations,
          resolutionRate: round2(rate(conversationsCompleted, conversations)),
          aiMessages,
          avgResponseTime: round2(avgResponseTime),
          takeovers,
          takeoverRate: round2(rate(takeovers, conversations)),
        },
      };
    });

    // Ordenar por número de conversas (descendente)
    agentMetrics.sort((a, b) => b.metrics.conversations - a.metrics.conversations);

    // Calcular totais gerais
    const totals = agentMetrics.reduce(
      (acc, item) => ({
        conversations: acc.conversations + item.metrics.conversations,
        conversationsCompleted: acc.conversationsCompleted + item.metrics.conversationsCompleted,
        aiMessages: acc.aiMessages + item.metrics.aiMessages,
        takeovers: acc.takeovers + item.metrics.takeovers,
      }),
      {
        conversations: 0,
        conversationsCompleted: 0,
        aiMessages: 0,
        takeovers: 0,
      }
    );

    return NextResponse.json({
      success: true,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        label: period || '7d',
      },
      totals,
      agents: agentMetrics,
    });
  } catch (error) {
    console.error('Error fetching agent analytics:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
