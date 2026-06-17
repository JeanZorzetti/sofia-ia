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

    const conversation = await prisma.conversation.findFirst({
      where: { id, agent: { createdBy: auth.id } },
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
  }
}

// PATCH — atribui (ou remove) um Team a uma conversa (Fase 3: modo conversa em time).
// Body: { teamId: string | null }. Quando setado, as próximas mensagens da conversa
// são atendidas pelo líder do time (com delegação). null volta ao single-agent.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const rawTeamId = (body as { teamId?: unknown }).teamId;

    if (rawTeamId !== null && typeof rawTeamId !== 'string') {
      return NextResponse.json(
        { error: 'teamId deve ser uma string ou null' },
        { status: 400 }
      );
    }

    // Ao atribuir, o time precisa pertencer ao usuário (evita IDOR).
    if (rawTeamId) {
      const team = await prisma.team.findFirst({
        where: { id: rawTeamId, createdBy: auth.id },
        select: { id: true },
      });
      if (!team) {
        return NextResponse.json(
          { error: 'Time não encontrado' },
          { status: 404 }
        );
      }
    }

    // A conversa precisa ser alcançável pelo usuário (via agente, via time, ou
    // ainda não reivindicada — WhatsApp cria conversas sem dono explícito).
    const conv = await prisma.conversation.findFirst({
      where: {
        id,
        OR: [
          { agent: { createdBy: auth.id } },
          { team: { createdBy: auth.id } },
          { AND: [{ agentId: null }, { teamId: null }] },
        ],
      },
      select: { id: true },
    });
    if (!conv) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      );
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: { teamId: rawTeamId },
      include: { team: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, conversation: updated });
  } catch (error) {
    console.error('Erro ao atualizar conversa:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar conversa' },
      { status: 500 }
    );
  }
}
