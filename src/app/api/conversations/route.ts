import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const channel = searchParams.get('channel');
    const agentId = searchParams.get('agentId');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Ownership: conversa pertence ao usuário via agente OU via time (Fase 3 —
    // conversas em modo Team têm agentId null e teamId setado). Usa AND para não
    // colidir com o OR da busca textual.
    const where: any = {
      AND: [
        {
          OR: [
            { agent: { createdBy: auth.id } },
            { team: { createdBy: auth.id } },
          ],
        },
      ],
    };

    if (status) {
      where.AND.push({ status });
    }

    if (channel) {
      where.AND.push({ channel });
    }

    if (agentId) {
      where.AND.push({ agentId });
    }

    if (search) {
      where.AND.push({
        OR: [
          { lead: { nome: { contains: search, mode: 'insensitive' } } },
          { lead: { telefone: { contains: search } } },
          { lead: { email: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    if (startDate || endDate) {
      const lastMessageAt: any = {};
      if (startDate) lastMessageAt.gte = new Date(startDate);
      if (endDate) lastMessageAt.lte = new Date(endDate);
      where.AND.push({ lastMessageAt });
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              nome: true,
              telefone: true,
              email: true,
              status: true,
              score: true,
            },
          },
          team: { select: { id: true, name: true } },
          messages: {
            orderBy: { sentAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ]);

    return NextResponse.json({
      conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar conversas' },
      { status: 500 }
    );
  }
}
