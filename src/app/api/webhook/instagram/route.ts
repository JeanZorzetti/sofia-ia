import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createInstagramService, InstagramWebhookEvent } from '@/lib/integrations/instagram';
import { chatWithAgent } from '@/lib/groq';

/**
 * GET /api/webhook/instagram
 * Verificação do webhook pelo Instagram/Facebook
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Busca integração ativa do Instagram
  const integration = await prisma.integration.findFirst({
    where: { type: 'instagram', status: 'active' },
  });

  if (!integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
  }

  const credentials = integration.credentials as any;

  // Verifica token
  if (mode === 'subscribe' && token === credentials.webhookVerifyToken) {
    console.log('Instagram webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/**
 * POST /api/webhook/instagram
 * Recebe eventos do Instagram
 */
export async function POST(request: NextRequest) {
  try {
    // Busca integração ativa
    const integration = await prisma.integration.findFirst({
      where: { type: 'instagram', status: 'active' },
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    const credentials = integration.credentials as any;
    const config = integration.config as any;
    const service = createInstagramService(credentials);

    // Verifica assinatura (em produção, implementar HMAC)
    const body = await request.text();

    // Processa evento
    const event: InstagramWebhookEvent = JSON.parse(body);
    const events = service.processWebhook(event);

    for (const event of events) {
      if (event.type === 'message' && event.text) {
        // Busca ou cria lead
        const lead = await prisma.lead.upsert({
          where: { telefone: `instagram:${event.senderId}` },
          update: {
            ultimaInteracao: new Date(),
          },
          create: {
            nome: 'Instagram User',
            telefone: `instagram:${event.senderId}`,
            fonte: 'instagram',
            status: 'novo',
          },
        });

        // Busca ou cria conversa
        let conversation = await prisma.conversation.findFirst({
          where: {
            leadId: lead.id,
            channel: 'instagram',
          },
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              leadId: lead.id,
              channel: 'instagram',
              status: 'active',
              whatsappChatId: event.senderId,
            },
          });
        }

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

        // Atualiza última mensagem
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: new Date(),
            messageCount: { increment: 1 },
          },
        });

        // Busca agente associado ao canal Instagram
        const agentChannel = await prisma.agentChannel.findFirst({
          where: {
            channel: 'instagram',
            isActive: true,
          },
          include: { agent: true },
        });

        if (agentChannel && config.autoReply !== false) {
          // Prepara mensagens para o agente
          const messages = [
            { role: 'user' as const, content: event.text },
          ];

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

          // Envia resposta
          await service.sendMessage({
            recipientId: event.senderId,
            text: result.message,
          });

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
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Instagram webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
