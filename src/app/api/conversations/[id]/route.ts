import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: params.id },
      include: {
        lead: {
          select: {
            id: true,
            nome: true,
            telefone: true,
            email: true,
            status: true,
            score: true,
            interesse: true,
            valorMin: true,
            valorMax: true,
            regiao: true,
            tipoImovel: true,
            fonte: true,
            ultimaInteracao: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Erro ao buscar conversa:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar conversa' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
