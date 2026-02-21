/**
 * Natural Language Analytics
 * Permite consultas em linguagem natural aos dados analíticos
 */

import { prisma } from './prisma';
import { getGroqClient } from './groq';

export interface NLQueryRequest {
  query: string;
  period?: '7d' | '30d' | '90d' | 'today';
}

export interface NLQueryResponse {
  success: boolean;
  interpretation?: string;
  result?: any;
  visualization?: 'number' | 'chart' | 'table' | 'text';
  sql?: string; // Para debug
  error?: string;
}

interface QueryIntent {
  type: 'count' | 'aggregate' | 'trend' | 'comparison' | 'top' | 'list';
  entity: 'leads' | 'conversations' | 'messages' | 'agents' | 'workflows';
  filters: Record<string, any>;
  timeRange: string;
  groupBy?: string;
  orderBy?: string;
  limit?: number;
}

/**
 * Parse de query em linguagem natural para intenção
 */
async function parseQueryIntent(query: string): Promise<QueryIntent> {
  const groq = getGroqClient();

  const systemPrompt = `Você é um parser de consultas analíticas. Analise a query do usuário e retorne um JSON com a estrutura da intenção.

Tipos de query suportados:
- count: contagens (quantos, quantas)
- aggregate: agregações (total, média, soma)
- trend: tendências ao longo do tempo (evolução, crescimento)
- comparison: comparações (comparar, vs, diferença)
- top: rankings (top, melhores, maiores)
- list: listagens (liste, mostre, quais)

Entidades: leads, conversations, messages, agents, workflows

Retorne apenas o JSON, sem explicações:
{
  "type": "count|aggregate|trend|comparison|top|list",
  "entity": "leads|conversations|messages|agents|workflows",
  "filters": { "status": "active", "channel": "whatsapp" },
  "timeRange": "7d|30d|90d|today",
  "groupBy": "date|channel|status|agent",
  "orderBy": "desc|asc",
  "limit": 10
}`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content || '{}';
  return JSON.parse(content) as QueryIntent;
}

/**
 * Executa query baseada na intenção
 */
async function executeQuery(intent: QueryIntent): Promise<any> {
  const { type, entity, filters, timeRange, groupBy, orderBy, limit } = intent;

  // Calcula datas baseado no timeRange
  const { startDate, endDate } = getDateRange(timeRange);

  switch (entity) {
    case 'leads':
      return executeLeadQuery(type, filters, startDate, endDate, groupBy, orderBy, limit);
    case 'conversations':
      return executeConversationQuery(type, filters, startDate, endDate, groupBy, orderBy, limit);
    case 'messages':
      return executeMessageQuery(type, filters, startDate, endDate, groupBy, orderBy, limit);
    case 'agents':
      return executeAgentQuery(type, filters, startDate, endDate, groupBy, orderBy, limit);
    case 'workflows':
      return executeWorkflowQuery(type, filters, startDate, endDate, groupBy, orderBy, limit);
    default:
      throw new Error(`Entidade não suportada: ${entity}`);
  }
}

/**
 * Query de leads
 */
async function executeLeadQuery(
  type: string,
  filters: any,
  startDate: Date,
  endDate: Date,
  groupBy?: string,
  orderBy?: string,
  limit?: number
): Promise<any> {
  const where: any = {
    createdAt: { gte: startDate, lte: endDate },
  };

  if (filters.status) where.status = filters.status;
  if (filters.fonte) where.fonte = filters.fonte;

  if (type === 'count') {
    const count = await prisma.lead.count({ where });
    return { count };
  }

  if (type === 'aggregate') {
    const leads = await prisma.lead.findMany({ where });
    const avgScore = leads.reduce((sum, l) => sum + l.score, 0) / leads.length || 0;
    return {
      count: leads.length,
      avgScore: Math.round(avgScore * 100) / 100,
      qualified: leads.filter(l => l.status === 'qualificado').length,
    };
  }

  if (type === 'top' || type === 'list') {
    const leads = await prisma.lead.findMany({
      where,
      orderBy: { score: orderBy === 'asc' ? 'asc' : 'desc' },
      take: limit || 10,
      select: {
        id: true,
        nome: true,
        telefone: true,
        score: true,
        status: true,
        createdAt: true,
      },
    });
    return { leads };
  }

  if (type === 'trend') {
    const leads = await prisma.lead.groupBy({
      by: ['createdAt'],
      where,
      _count: { id: true },
    });
    return {
      trend: leads.map((l: any) => ({
        date: l.createdAt.toISOString().split('T')[0],
        count: l._count.id,
      })),
    };
  }

  return null;
}

/**
 * Query de conversas
 */
async function executeConversationQuery(
  type: string,
  filters: any,
  startDate: Date,
  endDate: Date,
  groupBy?: string,
  orderBy?: string,
  limit?: number
): Promise<any> {
  const where: any = {
    createdAt: { gte: startDate, lte: endDate },
  };

  if (filters.status) where.status = filters.status;
  if (filters.channel) where.channel = filters.channel;
  if (filters.handledBy) where.handledBy = filters.handledBy;

  if (type === 'count') {
    const count = await prisma.conversation.count({ where });
    return { count };
  }

  if (type === 'aggregate') {
    const [total, active, closed, byChannel] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.count({ where: { ...where, status: 'active' } }),
      prisma.conversation.count({ where: { ...where, status: 'closed' } }),
      prisma.conversation.groupBy({
        by: ['channel'],
        where,
        _count: { id: true },
      }),
    ]);

    return {
      total,
      active,
      closed,
      byChannel: byChannel.reduce((acc: any, c: any) => {
        acc[c.channel] = c._count.id;
        return acc;
      }, {}),
    };
  }

  return null;
}

/**
 * Query de mensagens
 */
async function executeMessageQuery(
  type: string,
  filters: any,
  startDate: Date,
  endDate: Date,
  groupBy?: string,
  orderBy?: string,
  limit?: number
): Promise<any> {
  const where: any = {
    createdAt: { gte: startDate, lte: endDate },
  };

  if (filters.sender) where.sender = filters.sender;
  if (filters.isAiGenerated !== undefined) where.isAiGenerated = filters.isAiGenerated;

  if (type === 'count') {
    const count = await prisma.message.count({ where });
    return { count };
  }

  if (type === 'aggregate') {
    const [sent, received, aiGenerated] = await Promise.all([
      prisma.message.count({ where: { ...where, sender: 'agent' } }),
      prisma.message.count({ where: { ...where, sender: 'lead' } }),
      prisma.message.count({ where: { ...where, isAiGenerated: true } }),
    ]);

    return { sent, received, aiGenerated, total: sent + received };
  }

  return null;
}

/**
 * Query de agentes
 */
async function executeAgentQuery(
  type: string,
  filters: any,
  startDate: Date,
  endDate: Date,
  groupBy?: string,
  orderBy?: string,
  limit?: number
): Promise<any> {
  if (type === 'count') {
    const count = await prisma.agent.count();
    return { count };
  }

  if (type === 'top' || type === 'list') {
    const agents = await prisma.agent.findMany({
      include: {
        channels: true,
      },
      take: limit || 10,
    });

    return {
      agents: agents.map((a: any) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        channels: a.channels.map((c: any) => c.channel),
      })),
    };
  }

  return null;
}

/**
 * Query de workflows
 */
async function executeWorkflowQuery(
  type: string,
  filters: any,
  startDate: Date,
  endDate: Date,
  groupBy?: string,
  orderBy?: string,
  limit?: number
): Promise<any> {
  const where: any = {};

  if (filters.status) where.status = filters.status;

  if (type === 'count') {
    const count = await prisma.flow.count({ where });
    return { count };
  }

  if (type === 'aggregate') {
    const workflows = await prisma.flow.findMany({ where });
    const executions = await prisma.flowExecution.count({
      where: {
        startedAt: { gte: startDate, lte: endDate },
      },
    });

    return {
      totalWorkflows: workflows.length,
      active: workflows.filter((w: any) => w.status === 'active').length,
      totalExecutions: executions,
    };
  }

  return null;
}

/**
 * Calcula range de datas
 */
function getDateRange(timeRange: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  switch (timeRange) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case 'today':
      // Já está configurado para hoje
      break;
    default:
      startDate.setDate(endDate.getDate() - 7);
  }

  return { startDate, endDate };
}

/**
 * Gera resposta em linguagem natural
 */
async function generateNaturalResponse(query: string, result: any): Promise<string> {
  const groq = getGroqClient();

  const systemPrompt = `Você é um assistente analítico. Responda à pergunta do usuário de forma natural e concisa, usando os dados fornecidos.

Regras:
- Seja direto e objetivo
- Use os números exatos dos dados
- Formate valores monetários como R$ X.XXX,XX
- Formate porcentagens com %
- Seja amigável e profissional`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Pergunta: "${query}"\n\nDados: ${JSON.stringify(result)}\n\nResponda em português:` },
    ],
    temperature: 0.7,
    max_tokens: 200,
  });

  return completion.choices[0]?.message?.content || 'Não foi possível gerar uma resposta.';
}

/**
 * Processa consulta em linguagem natural
 */
export async function processNLQuery(request: NLQueryRequest): Promise<NLQueryResponse> {
  try {
    // Parse da intenção
    const intent = await parseQueryIntent(request.query);

    // Se período foi especificado na query, sobrescreve
    if (request.period) {
      intent.timeRange = request.period;
    }

    // Executa query
    const result = await executeQuery(intent);

    // Gera interpretação
    const interpretation = await generateNaturalResponse(request.query, result);

    // Determina tipo de visualização
    let visualization: NLQueryResponse['visualization'] = 'text';
    if (intent.type === 'count' || intent.type === 'aggregate') {
      visualization = 'number';
    } else if (intent.type === 'trend') {
      visualization = 'chart';
    } else if (intent.type === 'top' || intent.type === 'list') {
      visualization = 'table';
    }

    return {
      success: true,
      interpretation,
      result,
      visualization,
    };
  } catch (error) {
    console.error('NL Query error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao processar consulta',
    };
  }
}

/**
 * Sugestões de queries pré-definidas
 */
export const nlQuerySuggestions = [
  'Quantos leads qualificamos essa semana?',
  'Qual o total de conversas ativas?',
  'Quais são os 5 leads com maior score?',
  'Quantas mensagens foram enviadas hoje?',
  'Quantos agentes estão ativos?',
  'Qual a média de score dos leads?',
  'Quantas conversas vieram do WhatsApp vs Instagram?',
  'Quantas mensagens foram geradas por IA?',
];
