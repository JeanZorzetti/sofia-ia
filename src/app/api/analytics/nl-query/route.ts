import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getGroqClient } from '@/lib/groq';

/**
 * POST /api/analytics/nl-query
 * Processa perguntas em linguagem natural e retorna dados analíticos
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Pergunta é obrigatória' }, { status: 400 });
    }

    // Usa IA para entender a intenção e extrair parâmetros da query
    const groq = getGroqClient();

    const analysisPrompt = `Você é um assistente especializado em análise de dados de CRM e automação de marketing.

Analise a seguinte pergunta do usuário e extraia:
1. A intenção principal (metrics, comparison, trend, list, count)
2. As entidades mencionadas (leads, conversas, agentes, workflows, mensagens)
3. Filtros temporais (hoje, esta semana, este mês, últimos 7 dias, etc)
4. Filtros adicionais (status, canal, agente específico, etc)

Pergunta: "${question}"

Responda APENAS com um JSON válido no seguinte formato:
{
  "intent": "metrics|comparison|trend|list|count",
  "entities": ["leads", "conversas", "agentes", "workflows", "mensagens"],
  "timeFilter": {
    "period": "7d|30d|90d|today|this_week|this_month",
    "startDate": "YYYY-MM-DD ou null",
    "endDate": "YYYY-MM-DD ou null"
  },
  "additionalFilters": {
    "status": "string ou null",
    "channel": "string ou null",
    "agentId": "string ou null"
  },
  "metric": "count|sum|avg|rate",
  "naturalResponse": "resposta em português para exibir ao usuário"
}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: analysisPrompt },
        { role: 'user', content: question }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const aiResponse = completion.choices[0]?.message?.content || '{}';

    // Extrai JSON da resposta (pode vir com markdown)
    let queryPlan: any;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        queryPlan = JSON.parse(jsonMatch[0]);
      } else {
        queryPlan = JSON.parse(aiResponse);
      }
    } catch (error) {
      console.error('Failed to parse AI response:', aiResponse);
      return NextResponse.json({
        error: 'Não consegui entender sua pergunta. Tente reformular.',
        aiResponse
      }, { status: 400 });
    }

    // Calcula datas baseado no filtro temporal
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (queryPlan.timeFilter) {
      endDate = now;

      switch (queryPlan.timeFilter.period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'this_week':
          const dayOfWeek = now.getDay();
          startDate = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }

      if (queryPlan.timeFilter.startDate) {
        startDate = new Date(queryPlan.timeFilter.startDate);
      }
      if (queryPlan.timeFilter.endDate) {
        endDate = new Date(queryPlan.timeFilter.endDate);
      }
    }

    // Executa query baseada na intenção e entidades
    const data = await executeQuery(queryPlan, startDate, endDate);

    // Formata resposta natural
    const naturalResponse = await formatNaturalResponse(question, queryPlan, data);

    return NextResponse.json({
      success: true,
      question,
      queryPlan,
      data,
      response: naturalResponse,
    });
  } catch (error) {
    console.error('Error processing NL query:', error);
    return NextResponse.json(
      { error: 'Erro ao processar pergunta' },
      { status: 500 }
    );
  }
}

/**
 * Executa a query no banco de dados baseada no plano
 */
async function executeQuery(
  queryPlan: any,
  startDate: Date | null,
  endDate: Date | null
): Promise<any> {
  const { intent, entities, additionalFilters, metric } = queryPlan;

  const dateFilter = startDate && endDate ? {
    createdAt: {
      gte: startDate,
      lte: endDate,
    }
  } : {};

  // Queries para leads
  if (entities.includes('leads') || entities.includes('lead')) {
    if (intent === 'count') {
      const count = await prisma.lead.count({
        where: {
          ...dateFilter,
          ...(additionalFilters.status && { status: additionalFilters.status }),
        }
      });

      const qualifiedCount = await prisma.lead.count({
        where: {
          ...dateFilter,
          status: 'qualificado',
        }
      });

      return { total: count, qualified: qualifiedCount };
    }

    if (intent === 'list') {
      const leads = await prisma.lead.findMany({
        where: {
          ...dateFilter,
          ...(additionalFilters.status && { status: additionalFilters.status }),
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nome: true,
          telefone: true,
          status: true,
          score: true,
          createdAt: true,
        }
      });

      return { leads, count: leads.length };
    }

    if (intent === 'metrics') {
      const total = await prisma.lead.count({ where: dateFilter });
      const qualified = await prisma.lead.count({ where: { ...dateFilter, status: 'qualificado' } });
      const converted = await prisma.lead.count({ where: { ...dateFilter, status: 'convertido' } });

      const avgScore = await prisma.lead.aggregate({
        where: dateFilter,
        _avg: { score: true }
      });

      return {
        total,
        qualified,
        converted,
        avgScore: Math.round(avgScore._avg.score || 0),
        qualificationRate: total > 0 ? Math.round((qualified / total) * 100) : 0,
        conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
      };
    }
  }

  // Queries para conversas
  if (entities.includes('conversas') || entities.includes('conversa')) {
    if (intent === 'count') {
      const count = await prisma.conversation.count({
        where: {
          ...dateFilter,
          ...(additionalFilters.status && { status: additionalFilters.status }),
          ...(additionalFilters.channel && { channel: additionalFilters.channel }),
        }
      });

      return { total: count };
    }

    if (intent === 'metrics') {
      const total = await prisma.conversation.count({ where: dateFilter });
      const active = await prisma.conversation.count({ where: { ...dateFilter, status: 'active' } });
      const closed = await prisma.conversation.count({ where: { ...dateFilter, status: 'closed' } });

      const avgMessages = await prisma.conversation.aggregate({
        where: dateFilter,
        _avg: { messageCount: true }
      });

      return {
        total,
        active,
        closed,
        avgMessages: Math.round(avgMessages._avg.messageCount || 0),
      };
    }
  }

  // Queries para mensagens
  if (entities.includes('mensagens') || entities.includes('mensagem')) {
    if (intent === 'count') {
      const total = await prisma.message.count({ where: { sentAt: dateFilter.createdAt } });
      const aiGenerated = await prisma.message.count({
        where: {
          sentAt: dateFilter.createdAt,
          isAiGenerated: true,
        }
      });

      return { total, aiGenerated, humanGenerated: total - aiGenerated };
    }
  }

  // Queries para agentes
  if (entities.includes('agentes') || entities.includes('agente')) {
    if (intent === 'count' || intent === 'list') {
      const agents = await prisma.agent.findMany({
        where: {
          status: 'active',
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
        }
      });

      return { agents, count: agents.length };
    }
  }

  // Queries para workflows
  if (entities.includes('workflows') || entities.includes('workflow')) {
    if (intent === 'count' || intent === 'metrics') {
      const total = await prisma.workflow.count({ where: { status: 'active' } });
      const executions = await prisma.workflowExecution.count({
        where: {
          startedAt: dateFilter.createdAt,
        }
      });

      const successful = await prisma.workflowExecution.count({
        where: {
          startedAt: dateFilter.createdAt,
          status: 'completed',
        }
      });

      return {
        total,
        executions,
        successful,
        successRate: executions > 0 ? Math.round((successful / executions) * 100) : 0,
      };
    }
  }

  return { message: 'Não encontrei dados para sua pergunta' };
}

/**
 * Formata resposta em linguagem natural usando IA
 */
async function formatNaturalResponse(
  question: string,
  queryPlan: any,
  data: any
): Promise<string> {
  try {
    const groq = getGroqClient();

    const prompt = `Você é um assistente de analytics. Formate a resposta a seguir de forma concisa e natural em português.

Pergunta original: "${question}"

Dados obtidos: ${JSON.stringify(data, null, 2)}

Forneça uma resposta curta (máximo 2-3 frases) que responda à pergunta diretamente usando os dados.
Use números e percentuais quando relevante.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Você é um assistente que formata dados analíticos em respostas naturais.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 200,
    });

    return completion.choices[0]?.message?.content || 'Dados obtidos com sucesso.';
  } catch (error) {
    console.error('Error formatting natural response:', error);
    return `Encontrei os seguintes dados: ${JSON.stringify(data)}`;
  }
}
