import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

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

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      );
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: {
        status: 'closed',
        closedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      conversation: updatedConversation,
    });
  } catch (error) {
    console.error('Erro ao encerrar conversa:', error);
    return NextResponse.json(
      { error: 'Erro ao encerrar conversa' },
      { status: 500 }
    );
  }
}
