import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body; // 'takeover' ou 'release'

    if (!action || !['takeover', 'release'].includes(action)) {
      return NextResponse.json(
        { error: 'Ação inválida. Use "takeover" ou "release"' },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: params.id },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      );
    }

    const handledBy = action === 'takeover' ? 'human' : 'ai';

    const updatedConversation = await prisma.conversation.update({
      where: { id: params.id },
      data: {
        handledBy,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      handledBy,
      conversation: updatedConversation,
    });
  } catch (error) {
    console.error('Erro ao realizar takeover:', error);
    return NextResponse.json(
      { error: 'Erro ao realizar takeover' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
