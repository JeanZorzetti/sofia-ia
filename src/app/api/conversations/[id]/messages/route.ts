import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId: id },
        orderBy: { sentAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.message.count({ where: { conversationId: id } }),
    ]);

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar mensagens' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { content, messageType = 'text' } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Conteúdo da mensagem é obrigatório' },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      );
    }

    const message = await prisma.message.create({
      data: {
        conversationId: id,
        leadId: conversation.leadId,
        sender: 'assistant',
        content,
        messageType,
        isAiGenerated: false,
        sentAt: new Date(),
      },
    });

    await prisma.conversation.update({
      where: { id },
      data: {
        lastMessageAt: new Date(),
        messageCount: { increment: 1 },
      },
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar mensagem' },
      { status: 500 }
    );
  }
}
