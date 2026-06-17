import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { resolveAccountByUser, sendWhatsAppMessage } from '@/lib/whatsapp-cloud-service';
import { prisma } from '@/lib/prisma';

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * POST /api/messages/send
 * Envio manual de mensagem de texto via WABA. Body: { number, text, phoneNumberId? }.
 * Resolve o número WABA do usuário (phoneNumberId opcional escolhe qual).
 * Obs: texto livre só entrega dentro da janela de 24h do cliente (regra da Meta).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkRateLimit(`msg_${user.id}`)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { number, text, phoneNumberId } = body;

    if (!number || typeof number !== 'string') {
      return NextResponse.json(
        { success: false, error: 'number is required and must be a string' },
        { status: 400 }
      );
    }

    const cleanNumber = number.replace(/\D/g, '');
    if (cleanNumber.length < 10 || cleanNumber.length > 15) {
      return NextResponse.json(
        { success: false, error: 'number must contain 10-15 digits' },
        { status: 400 }
      );
    }

    if (!text || typeof text !== 'string' || text.length < 1 || text.length > 4000) {
      return NextResponse.json(
        { success: false, error: 'text is required (1-4000 chars)' },
        { status: 400 }
      );
    }

    const account = await resolveAccountByUser(user.id, phoneNumberId);
    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Nenhum número WhatsApp conectado' },
        { status: 400 }
      );
    }

    const result = await sendWhatsAppMessage(account, cleanNumber, text);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 502 });
    }

    // Persistir a mensagem enviada (lead + conversa + message)
    try {
      let lead = await prisma.lead.findUnique({ where: { telefone: cleanNumber } });
      if (!lead) {
        lead = await prisma.lead.create({
          data: {
            nome: cleanNumber,
            telefone: cleanNumber,
            status: 'novo',
            fonte: 'whatsapp',
            score: 0,
            metadata: { whatsappContactId: cleanNumber, provider: 'meta-cloud-api' },
          },
        });
      }

      let conversation = await prisma.conversation.findFirst({
        where: { leadId: lead.id, channel: 'whatsapp', status: 'active' },
      });
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            leadId: lead.id,
            whatsappChatId: cleanNumber,
            channel: 'whatsapp',
            status: 'active',
            startedAt: new Date(),
            lastMessageAt: new Date(),
            messageCount: 0,
          },
        });
      }

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          leadId: lead.id,
          whatsappMessageId: result.messageId,
          sender: 'assistant',
          messageType: 'text',
          content: text,
          isAiGenerated: false, // envio manual
          sentAt: new Date(),
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { messageCount: { increment: 1 }, lastMessageAt: new Date() },
      });

      await prisma.lead.update({ where: { id: lead.id }, data: { ultimaInteracao: new Date() } });
    } catch (dbError) {
      console.error('❌ Erro ao salvar mensagem enviada no banco:', dbError);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
  }
}
