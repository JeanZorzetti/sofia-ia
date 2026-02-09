import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getGroqClient } from '@/lib/groq';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// POST /api/chat/widget - Widget chat endpoint (no auth required)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, sessionId, message } = body;

    if (!agentId || !sessionId || !message) {
      return NextResponse.json(
        { error: 'agentId, sessionId e message são obrigatórios' },
        { status: 400 }
      );
    }

    // Get agent configuration
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agente não encontrado' },
        { status: 404 }
      );
    }

    if (agent.status !== 'active') {
      return NextResponse.json(
        { error: 'Agente não está ativo' },
        { status: 403 }
      );
    }

    // Get or create conversation for this widget session
    let conversation = await prisma.conversation.findFirst({
      where: {
        channel: 'webchat',
        whatsappChatId: sessionId, // Reusing this field for session ID
      },
    });

    let lead;

    if (!conversation) {
      // Create anonymous lead for widget user
      lead = await prisma.lead.create({
        data: {
          nome: `Widget User ${sessionId.substring(0, 8)}`,
          telefone: `widget-${sessionId}`,
          fonte: 'webchat',
          metadata: {
            sessionId,
            userAgent: request.headers.get('user-agent'),
          },
        },
      });

      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          leadId: lead.id,
          agentId: agent.id,
          whatsappChatId: sessionId,
          channel: 'webchat',
          status: 'active',
          handledBy: 'ai',
        },
      });
    } else {
      lead = await prisma.lead.findUnique({
        where: { id: conversation.leadId },
      });
    }

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      );
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        leadId: lead.id,
        sender: 'user',
        content: message,
        messageType: 'text',
      },
    });

    // Get conversation history (last 10 messages)
    const history = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { sentAt: 'asc' },
      take: 10,
    });

    // Build messages array for AI
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: agent.systemPrompt,
      },
    ];

    // Add conversation history
    for (const msg of history) {
      messages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    // Get AI response
    const groq = getGroqClient();
    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: agent.model,
      temperature: agent.temperature,
      max_tokens: 512,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';

    // Save AI response
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        leadId: lead.id,
        sender: 'assistant',
        content: aiResponse,
        messageType: 'text',
        isAiGenerated: true,
        aiModel: agent.model,
      },
    });

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        messageCount: {
          increment: 2, // user + assistant
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: aiResponse,
      sessionId,
    });
  } catch (error) {
    console.error('Error in widget chat:', error);
    return NextResponse.json(
      { error: 'Erro ao processar mensagem' },
      { status: 500 }
    );
  }
}
