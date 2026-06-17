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

    // Tentar buscar conversas reais do banco de dados
    try {
      const conversations = await prisma.conversation.findMany({
        where: {
          status: 'active'
        },
        include: {
          lead: {
            select: {
              id: true,
              nome: true,
              telefone: true,
              status: true,
              score: true,
              metadata: true
            }
          },
          messages: {
            orderBy: {
              sentAt: 'desc'
            },
            take: 1
          }
        },
        orderBy: {
          lastMessageAt: 'desc'
        },
        take: 50
      })

      // Formatar conversas para o formato esperado pelo frontend
      const formattedConversations = conversations.map(conv => {
        const lastMessage = conv.messages[0]
        const leadStatusMap: Record<string, string> = {
          'novo': 'cold',
          'qualificado': 'warm',
          'interessado': 'hot',
          'convertido': 'immediate'
        }

        return {
          id: conv.id,
          contact: {
            name: conv.lead.nome,
            phone: conv.lead.telefone,
            avatar: null
          },
          last_message: lastMessage ? {
            text: lastMessage.content,
            timestamp: lastMessage.sentAt.toISOString(),
            from_me: lastMessage.sender === 'assistant'
          } : null,
          unread_count: 0, // Pode ser calculado depois com campo no banco
          lead_status: leadStatusMap[conv.lead.status] || 'cold',
          instance_name: ((conv.lead.metadata as Record<string, unknown>)?.instanceName as string) || 'default',
          updated_at: conv.lastMessageAt.toISOString()
        }
      })

      console.log(`✅ Retornando ${formattedConversations.length} conversas do banco`)
      return NextResponse.json({
        success: true,
        data: formattedConversations
      })
    } catch (dbError) {
      console.error('❌ Erro ao buscar conversas do banco:', dbError)
      // Sem fallback simulado — retorna lista vazia
      return NextResponse.json({ success: true, data: [] })
    }
  } catch (error) {
    console.error('Error fetching recent conversations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent conversations' },
      { status: 500 }
    );
  }
}
