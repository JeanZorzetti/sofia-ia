import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface DailyMetrics {
  date: Date;
  conversationsStarted: number;
  conversationsCompleted: number;
  messagesSent: number;
  messagesReceived: number;
  leadsCreated: number;
  leadsQualified: number;
  conversionCount: number;
  conversionRate: number;
  avgResponseTime: number;
  aiInteractions: number;
  metadata: Prisma.InputJsonValue;
}

/**
 * Calcula métricas diárias baseadas nos dados do banco
 */
export async function calculateDailyMetrics(date: Date): Promise<DailyMetrics> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Conversas iniciadas nesse dia
  const conversationsStarted = await prisma.conversation.count({
    where: {
      startedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Conversas completadas (encerradas) nesse dia
  const conversationsCompleted = await prisma.conversation.count({
    where: {
      closedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Mensagens enviadas (do sistema/AI)
  const messagesSent = await prisma.message.count({
    where: {
      sentAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      sender: 'assistant',
    },
  });

  // Mensagens recebidas (do usuário)
  const messagesReceived = await prisma.message.count({
    where: {
      sentAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      sender: 'user',
    },
  });

  // Leads criados
  const leadsCreated = await prisma.lead.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Leads qualificados (score >= 60)
  const leadsQualified = await prisma.lead.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      score: {
        gte: 60,
      },
    },
  });

  // Conversões (leads convertidos - status 'convertido')
  const conversionCount = await prisma.lead.count({
    where: {
      updatedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: 'convertido',
    },
  });

  // Taxa de conversão
  const conversionRate = leadsCreated > 0 ? (conversionCount / leadsCreated) * 100 : 0;

  // Interações com IA
  const aiInteractions = await prisma.message.count({
    where: {
      sentAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      isAiGenerated: true,
    },
  });

  // Tempo médio de resposta (em segundos)
  // Calculamos comparando mensagens user -> assistant consecutivas
  const conversations = await prisma.conversation.findMany({
    where: {
      lastMessageAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      messages: {
        orderBy: { sentAt: 'asc' },
        where: {
          sentAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      },
    },
  });

  let totalResponseTime = 0;
  let responseCount = 0;

  for (const conv of conversations) {
    for (let i = 0; i < conv.messages.length - 1; i++) {
      const current = conv.messages[i];
      const next = conv.messages[i + 1];

      if (current.sender === 'user' && next.sender === 'assistant') {
        const responseTime = (next.sentAt.getTime() - current.sentAt.getTime()) / 1000; // em segundos
        totalResponseTime += responseTime;
        responseCount++;
      }
    }
  }

  const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

  // Metadata adicional por agente
  const agentStats = await prisma.conversation.groupBy({
    by: ['agentId'],
    where: {
      startedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    _count: {
      id: true,
    },
  });

  const metadata: Prisma.InputJsonValue = {
    agentStats: agentStats.map(stat => ({
      agentId: stat.agentId,
      conversations: stat._count.id,
    })),
  };

  return {
    date,
    conversationsStarted,
    conversationsCompleted,
    messagesSent,
    messagesReceived,
    leadsCreated,
    leadsQualified,
    conversionCount,
    conversionRate,
    avgResponseTime,
    aiInteractions,
    metadata,
  };
}

/**
 * Popula ou atualiza a tabela AnalyticsDaily para uma data específica
 */
export async function populateDailyAnalytics(date: Date): Promise<void> {
  const metrics = await calculateDailyMetrics(date);

  // Normaliza a data para midnight UTC para garantir consistência
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  await prisma.analyticsDaily.upsert({
    where: {
      date: normalizedDate,
    },
    create: {
      date: normalizedDate,
      conversationsStarted: metrics.conversationsStarted,
      conversationsCompleted: metrics.conversationsCompleted,
      messagesSent: metrics.messagesSent,
      messagesReceived: metrics.messagesReceived,
      leadsCreated: metrics.leadsCreated,
      leadsQualified: metrics.leadsQualified,
      conversionCount: metrics.conversionCount,
      conversionRate: metrics.conversionRate,
      avgResponseTime: metrics.avgResponseTime,
      aiInteractions: metrics.aiInteractions,
      metadata: metrics.metadata,
    },
    update: {
      conversationsStarted: metrics.conversationsStarted,
      conversationsCompleted: metrics.conversationsCompleted,
      messagesSent: metrics.messagesSent,
      messagesReceived: metrics.messagesReceived,
      leadsCreated: metrics.leadsCreated,
      leadsQualified: metrics.leadsQualified,
      conversionCount: metrics.conversionCount,
      conversionRate: metrics.conversionRate,
      avgResponseTime: metrics.avgResponseTime,
      aiInteractions: metrics.aiInteractions,
      metadata: metrics.metadata,
    },
  });
}

/**
 * Popula analytics para os últimos N dias
 */
export async function populateAnalyticsForLastDays(days: number = 30): Promise<void> {
  const promises: Promise<void>[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    promises.push(populateDailyAnalytics(date));
  }

  await Promise.all(promises);
}
