import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createTelegramService, TelegramUpdate } from '@/lib/integrations/telegram';
import { chatWithAgent } from '@/lib/groq';

/**
 * POST /api/webhook/telegram
 * Recebe updates do Telegram
 */
export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();

    // Busca integração ativa do Telegram
    const integration = await prisma.integration.findFirst({
      where: { type: 'telegram', status: 'active' },
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    const credentials = integration.credentials as any;
    const config = integration.config as any;
    const service = createTelegramService(credentials);

    // Processa update
    const event = service.processUpdate(update);

    if (!event) {
      return NextResponse.json({ success: true });
    }

    const chatId = event.chat.id;
    const userName = event.user.first_name + (event.user.last_name ? ` ${event.user.last_name}` : '');
    const userId = event.user.id;

    // Busca ou cria lead
    const lead = await prisma.lead.upsert({
      where: { telefone: `telegram:${userId}` },
      update: {
        nome: userName,
        ultimaInteracao: new Date(),
      },
      create: {
        nome: userName,
        telefone: `telegram:${userId}`,
        fonte: 'telegram',
        status: 'novo',
      },
    });

    // Busca ou cria conversa
    let conversation = await prisma.conversation.findFirst({
      where: {
        leadId: lead.id,
        channel: 'telegram',
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          leadId: lead.id,
          channel: 'telegram',
          status: 'active',
          whatsappChatId: String(chatId),
        },
      });
    }

    if (event.type === 'message' && event.text) {
      // Salva mensagem recebida
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          leadId: lead.id,
          sender: 'lead',
          content: event.text,
          messageType: 'text',
        },
      });

      // Atualiza conversa
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          messageCount: { increment: 1 },
        },
      });

      // Busca agente associado ao canal Telegram
      const agentChannel = await prisma.agentChannel.findFirst({
        where: {
          channel: 'telegram',
          isActive: true,
        },
        include: { agent: true },
      });

      if (agentChannel && config.autoReply !== false) {
        // Prepara mensagens
        const messages = [{ role: 'user' as const, content: event.text }];

        // Chama agente de IA
        const result = await chatWithAgent(
          agentChannel.agentId,
          messages,
          {
            leadName: lead.nome,
            leadPhone: lead.telefone,
            leadStatus: lead.status,
          }
        );

        // Envia resposta com botões se configurado
        if (config.showButtons) {
          await service.sendMessageWithButtons(
            chatId,
            result.message,
            [
              { text: 'Falar com humano', callback_data: 'human_handoff' },
              { text: 'Ver serviços', callback_data: 'view_services' },
            ],
            2
          );
        } else {
          await service.sendMessage({
            chatId,
            text: result.message,
            parseMode: config.parseMode || 'HTML',
          });
        }

        // Salva resposta
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            leadId: lead.id,
            sender: 'agent',
            content: result.message,
            messageType: 'text',
            isAiGenerated: true,
            aiModel: result.model,
          },
        });
      }
    } else if (event.type === 'callback_query' && event.data) {
      // Responde callback query
      await service.answerCallbackQuery(String(event.id));

      // Processa ação do botão
      if (event.data === 'human_handoff') {
        // Takeover humano
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { handledBy: 'human' },
        });

        await service.sendMessage({
          chatId,
          text: 'Você será atendido por um humano em breve. Aguarde...',
        });
      } else if (event.data === 'view_services') {
        await service.sendMessage({
          chatId,
          text: '📋 Confira nossos serviços disponíveis:\n\nEm breve você poderá ver todos os detalhes aqui!',
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * GET /api/webhook/telegram
 * Configura webhook do Telegram
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  const integration = await prisma.integration.findFirst({
    where: { type: 'telegram', status: 'active' },
  });

  if (!integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
  }

  const credentials = integration.credentials as any;
  const service = createTelegramService(credentials);

  if (action === 'setup') {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    const result = await service.setWebhook(`${baseUrl}/api/webhook/telegram`);

    if (result.success) {
      return NextResponse.json({ success: true, message: 'Webhook configurado' });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } else if (action === 'remove') {
    const result = await service.deleteWebhook();

    if (result.success) {
      return NextResponse.json({ success: true, message: 'Webhook removido' });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  }

  // Verifica status
  const validation = await service.validate();
  return NextResponse.json(validation);
}
