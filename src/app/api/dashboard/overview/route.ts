import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Tentar buscar dados reais do banco
    try {
      // Calcular métricas reais
      const totalMessages = await prisma.message.count()
      const activeConversations = await prisma.conversation.count({
        where: { status: 'active' }
      })
      const qualifiedLeads = await prisma.lead.count({
        where: { status: 'qualificado' }
      })
      const totalLeads = await prisma.lead.count()
      const conversionRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0

      // Calcular crescimento baseado em conversas dos últimos 7 dias vs 7 dias anteriores
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

      const recentConversations = await prisma.conversation.count({
        where: {
          createdAt: { gte: sevenDaysAgo }
        }
      })
      const previousConversations = await prisma.conversation.count({
        where: {
          createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo }
        }
      })

      let growthPercentage = 0
      if (previousConversations > 0) {
        growthPercentage = ((recentConversations - previousConversations) / previousConversations) * 100
      } else if (recentConversations > 0) {
        growthPercentage = 100
      }

      // Gerar dados do gráfico de atividade (últimos 7 dias)
      const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
      const activity_chart = []

      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const startOfDay = new Date(date.setHours(0, 0, 0, 0))
        const endOfDay = new Date(date.setHours(23, 59, 59, 999))

        const messagesCount = await prisma.message.count({
          where: {
            sentAt: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        })

        const dayName = daysOfWeek[startOfDay.getDay()]
        activity_chart.push({
          day: dayName,
          messages: messagesCount
        })
      }

      // Gerar dados de leads por status
      const leadsByStatus = await prisma.lead.groupBy({
        by: ['status'],
        _count: true
      })

      const statusColorMap: Record<string, string> = {
        'novo': '#94a3b8',
        'qualificado': '#fbbf24',
        'interessado': '#f97316',
        'convertido': '#22c55e'
      }

      const statusLabelMap: Record<string, string> = {
        'novo': 'cold',
        'qualificado': 'warm',
        'interessado': 'hot',
        'convertido': 'immediate'
      }

      const leads_by_status = leadsByStatus.map(item => ({
        status: statusLabelMap[item.status] || item.status,
        count: item._count,
        color: statusColorMap[item.status] || '#94a3b8'
      }))

      console.log('✅ Retornando métricas reais do banco')

      // Return overview data
      return NextResponse.json({
        success: true,
        data: {
          stats: {
            total_messages: totalMessages,
            active_conversations: activeConversations,
            qualified_leads: qualifiedLeads,
            conversion_rate: Number(conversionRate.toFixed(2)),
            growth_percentage: Number(growthPercentage.toFixed(1))
          },
          activity_chart,
          leads_by_status
        }
      })
    } catch (dbError) {
      console.error('❌ Erro ao buscar métricas do banco:', dbError)
      // Continua para fallback
    }

    // DB indisponível → resposta zerada (sem fallback simulado de instâncias)
    return NextResponse.json({
      success: true,
      data: {
        stats: {
          total_messages: 0,
          active_conversations: 0,
          qualified_leads: 0,
          conversion_rate: 0,
          growth_percentage: 0
        },
        activity_chart: [],
        leads_by_status: []
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard overview' },
      { status: 500 }
    );
  }
}
