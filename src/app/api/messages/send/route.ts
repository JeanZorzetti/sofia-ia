import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { sendMessage } from '@/lib/evolution-service';
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

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimitKey = `msg_${user.id}`;
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const { instanceName, number, text } = body;

    // Validation
    if (!instanceName || typeof instanceName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'instanceName is required and must be a string' },
        { status: 400 }
      );
    }

    if (!number || typeof number !== 'string') {
      return NextResponse.json(
        { success: false, error: 'number is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate number (10-15 digits)
    const cleanNumber = number.replace(/\D/g, '');
    if (cleanNumber.length < 10 || cleanNumber.length > 15) {
      return NextResponse.json(
        { success: false, error: 'number must contain 10-15 digits' },
        { status: 400 }
      );
    }

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'text is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate text length (1-4000 chars)
    if (text.length < 1 || text.length > 4000) {
      return NextResponse.json(
        { success: false, error: 'text must be between 1 and 4000 characters' },
        { status: 400 }
      );
    }

    // Send message
    const result = await sendMessage(instanceName, number, text);

    // Salvar mensagem enviada no banco de dados
    if (result.success) {
      try {
        const phoneNumber = cleanNumber
        const contact = `${cleanNumber}@s.whatsapp.net`

        // Buscar ou criar Lead
        let lead = await prisma.lead.findUnique({
          where: { telefone: phoneNumber }
        })

        if (!lead) {
          lead = await prisma.lead.create({
            data: {
              nome: phoneNumber,
              telefone: phoneNumber,
              status: 'novo',
              fonte: 'whatsapp',
              score: 0,
              metadata: {
                whatsappChatId: contact,
                instanceName: instanceName
              }
            }
          })
        }

        // Buscar ou criar Conversation
        let conversation = await prisma.conversation.findFirst({
          where: {
            leadId: lead.id,
            whatsappChatId: contact,
            status: 'active'
          }
        })

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              leadId: lead.id,
              whatsappChatId: contact,
              status: 'active',
              startedAt: new Date(),
              lastMessageAt: new Date(),
              messageCount: 0
            }
          })
        }

        // Salvar mensagem enviada
        const resultData = result.data as Record<string, unknown> | undefined
        const messageKey = (resultData?.key as Record<string, unknown>) || {}
        const messageId = (messageKey.id as string) || `sent_${Date.now()}`

        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            leadId: lead.id,
            whatsappMessageId: messageId,
            sender: 'assistant',
            messageType: 'text',
            content: text,
            isAiGenerated: false, // Mensagem manual do usuário
            sentAt: new Date(),
          }
        })

        // Atualizar conversa
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            messageCount: { increment: 1 },
            lastMessageAt: new Date()
          }
        })

        // Atualizar última interação do lead
        await prisma.lead.update({
          where: { id: lead.id },
          data: { ultimaInteracao: new Date() }
        })

        console.log('✅ Mensagem enviada salva no banco:', messageId)
      } catch (dbError) {
        console.error('❌ Erro ao salvar mensagem enviada no banco:', dbError)
        // Não falha o request mesmo se o banco falhar
      }
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
