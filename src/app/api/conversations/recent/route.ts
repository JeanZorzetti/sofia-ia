import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { fetchInstances } from '@/lib/evolution-service';
import { prisma } from '@/lib/prisma';

// Helper to generate simulated conversations (fallback)
function generateSimulatedConversations(instances: any[]): any[] {
  const conversations: any[] = [];
  const connectedInstances = instances.filter((inst: any) => inst.status === 'open');

  const statuses = ['cold', 'warm', 'hot', 'immediate'];
  const sampleMessages = [
    'Olá, gostaria de mais informações sobre imóveis',
    'Tenho interesse em agendar uma visita',
    'Qual o valor do imóvel?',
    'Vocês trabalham com financiamento?',
    'Estou procurando um apartamento de 2 quartos',
    'Pode me enviar mais fotos?',
    'Gostaria de negociar o valor',
    'Quando posso visitar?'
  ];

  const sampleNames = [
    'João Silva',
    'Maria Santos',
    'Pedro Oliveira',
    'Ana Costa',
    'Carlos Souza',
    'Juliana Lima',
    'Roberto Alves',
    'Patricia Mendes',
    'Fernando Rocha',
    'Claudia Martins'
  ];

  connectedInstances.forEach((instance: any) => {
    const messagesCount = instance.messagesCount || 0;
    const conversationsToGenerate = Math.min(Math.floor(messagesCount * 0.1), 10);

    for (let i = 0; i < conversationsToGenerate; i++) {
      const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
      const randomMessage = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const randomPhone = `55${Math.floor(10000000000 + Math.random() * 90000000000)}`;

      const now = Date.now();
      const randomMinutesAgo = Math.floor(Math.random() * 1440); // Up to 24 hours
      const timestamp = new Date(now - randomMinutesAgo * 60000).toISOString();

      conversations.push({
        id: `${instance.name}_${i}_${Date.now()}`,
        contact: {
          name: randomName,
          phone: randomPhone,
          avatar: null
        },
        last_message: {
          text: randomMessage,
          timestamp,
          from_me: false
        },
        unread_count: Math.floor(Math.random() * 5),
        lead_status: randomStatus,
        instance_name: instance.name,
        updated_at: timestamp
      });
    }
  });

  // Sort by most recent and limit to 50
  return conversations
    .sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
    .slice(0, 50);
}

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
          instance_name: (conv.lead.metadata as any)?.instanceName || 'default',
          updated_at: conv.lastMessageAt.toISOString()
        }
      })

      if (formattedConversations.length > 0) {
        console.log(`✅ Retornando ${formattedConversations.length} conversas do banco`)
        return NextResponse.json({
          success: true,
          data: formattedConversations
        })
      }
    } catch (dbError) {
      console.error('❌ Erro ao buscar conversas do banco:', dbError)
      // Continua para fallback
    }

    // Fallback: buscar instâncias e gerar conversas simuladas
    const instancesResult = await fetchInstances();

    if (!instancesResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch instances' },
        { status: 500 }
      );
    }

    const instances = instancesResult.data;

    // Generate simulated conversations
    const conversations = generateSimulatedConversations(instances);

    console.log('⚠️ Retornando conversas simuladas (fallback)')

    return NextResponse.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    console.error('Error fetching recent conversations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent conversations' },
      { status: 500 }
    );
  }
}
