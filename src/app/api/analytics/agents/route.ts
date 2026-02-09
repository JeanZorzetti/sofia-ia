import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Buscar todos os agentes
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

    // Para cada agente, calcular métricas no período
    const agentMetrics = await Promise.all(
      agents.map(async (agent) => {
        // Conversas do agente no período
        const conversations = await prisma.conversation.count({
          where: {
            agentId: agent.id,
            startedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        // Conversas encerradas com sucesso
        const conversationsCompleted = await prisma.conversation.count({
          where: {
            agentId: agent.id,
            closedAt: {
              gte: startDate,
              lte: endDate,
            },
            status: 'closed',
          },
        });

        // Taxa de resolução
        const resolutionRate = conversations > 0
          ? (conversationsCompleted / conversations) * 100
          : 0;

        // Mensagens geradas por IA deste agente
        const aiMessages = await prisma.message.count({
          where: {
            isAiGenerated: true,
            sentAt: {
              gte: startDate,
              lte: endDate,
            },
            conversation: {
              agentId: agent.id,
            },
          },
        });

        // Tempo médio de resposta
        const conversationsWithMessages = await prisma.conversation.findMany({
          where: {
            agentId: agent.id,
            lastMessageAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            messages: {
              orderBy: { sentAt: 'asc' },
              where: {
                sentAt: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            },
          },
        });

        let totalResponseTime = 0;
        let responseCount = 0;

        for (const conv of conversationsWithMessages) {
          for (let i = 0; i < conv.messages.length - 1; i++) {
            const current = conv.messages[i];
            const next = conv.messages[i + 1];

            if (current.sender === 'user' && next.sender === 'assistant') {
              const responseTime = (next.sentAt.getTime() - current.sentAt.getTime()) / 1000;
              totalResponseTime += responseTime;
              responseCount++;
            }
          }
        }

        const avgResponseTime = responseCount > 0
          ? totalResponseTime / responseCount
          : 0;

        // Conversas ativas agora
        const activeConversations = await prisma.conversation.count({
          where: {
            agentId: agent.id,
            status: 'active',
          },
        });

        // Takeovers (conversas assumidas por humano)
        const takeovers = await prisma.conversation.count({
          where: {
            agentId: agent.id,
            handledBy: 'human',
            startedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        const takeoverRate = conversations > 0
          ? (takeovers / conversations) * 100
          : 0;

        return {
          agent: {
            id: agent.id,
            name: agent.name,
            description: agent.description,
            status: agent.status,
            model: agent.model,
            channels: agent.channels.map(ch => ({
              channel: ch.channel,
              isActive: ch.isActive,
            })),
            createdBy: agent.creator.name,
          },
          metrics: {
            conversations,
            conversationsCompleted,
            conversationsActive: activeConversations,
            resolutionRate: Math.round(resolutionRate * 100) / 100,
            aiMessages,
            avgResponseTime: Math.round(avgResponseTime * 100) / 100,
            takeovers,
            takeoverRate: Math.round(takeoverRate * 100) / 100,
          },
        };
      })
    );

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
