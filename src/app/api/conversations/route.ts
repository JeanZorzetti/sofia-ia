import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

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

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (channel) {
      where.channel = channel;
    }

    if (agentId) {
      where.agentId = agentId;
    }

    if (search) {
      where.OR = [
        { lead: { nome: { contains: search, mode: 'insensitive' } } },
        { lead: { telefone: { contains: search } } },
        { lead: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (startDate || endDate) {
      where.lastMessageAt = {};
      if (startDate) {
        where.lastMessageAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.lastMessageAt.lte = new Date(endDate);
      }
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
  } finally {
    await prisma.$disconnect();
  }
}
