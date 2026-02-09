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
    const { action, tag } = body; // action: 'add' ou 'remove'

    if (!action || !['add', 'remove'].includes(action)) {
      return NextResponse.json(
        { error: 'Ação inválida. Use "add" ou "remove"' },
        { status: 400 }
      );
    }

    if (!tag || typeof tag !== 'string') {
      return NextResponse.json(
        { error: 'Tag inválida' },
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

    let newTags = [...conversation.tags];

    if (action === 'add') {
      if (!newTags.includes(tag)) {
        newTags.push(tag);
      }
    } else if (action === 'remove') {
      newTags = newTags.filter((t) => t !== tag);
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id: params.id },
      data: {
        tags: newTags,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      tags: updatedConversation.tags,
      conversation: updatedConversation,
    });
  } catch (error) {
    console.error('Erro ao atualizar tags:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar tags' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
