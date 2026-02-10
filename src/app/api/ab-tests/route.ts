import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/ab-tests - Lista todos os testes A/B
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const tests = await prisma.aBTest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { interactions: true }
        }
      }
    });

    // Buscar nomes dos agentes
    const testsWithAgentNames = await Promise.all(
      tests.map(async (test) => {
        const [agentA, agentB, winner] = await Promise.all([
          prisma.agent.findUnique({ where: { id: test.agentAId }, select: { name: true } }),
          prisma.agent.findUnique({ where: { id: test.agentBId }, select: { name: true } }),
          test.winnerAgentId ? prisma.agent.findUnique({ where: { id: test.winnerAgentId }, select: { name: true } }) : null
        ]);

        return {
          ...test,
          agentAName: agentA?.name || 'Unknown',
          agentBName: agentB?.name || 'Unknown',
          winnerAgentName: winner?.name || null,
          interactionsCount: test._count.interactions,
        };
      })
    );

    return NextResponse.json({ tests: testsWithAgentNames });
  } catch (error) {
    console.error('Error fetching A/B tests:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar testes A/B' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ab-tests - Cria um novo teste A/B
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, agentAId, agentBId, trafficSplit = 50 } = body;

    if (!name || !agentAId || !agentBId) {
      return NextResponse.json(
        { error: 'Nome, agentAId e agentBId são obrigatórios' },
        { status: 400 }
      );
    }

    if (agentAId === agentBId) {
      return NextResponse.json(
        { error: 'Os agentes devem ser diferentes' },
        { status: 400 }
      );
    }

    if (trafficSplit < 1 || trafficSplit > 99) {
      return NextResponse.json(
        { error: 'Traffic split deve estar entre 1 e 99' },
        { status: 400 }
      );
    }

    // Verifica se os agentes existem
    const [agentA, agentB] = await Promise.all([
      prisma.agent.findUnique({ where: { id: agentAId } }),
      prisma.agent.findUnique({ where: { id: agentBId } }),
    ]);

    if (!agentA || !agentB) {
      return NextResponse.json(
        { error: 'Um ou ambos os agentes não existem' },
        { status: 404 }
      );
    }

    const test = await prisma.aBTest.create({
      data: {
        name,
        description,
        agentAId,
        agentBId,
        trafficSplit,
        status: 'draft',
        createdBy: auth.id,
      },
    });

    return NextResponse.json({ test }, { status: 201 });
  } catch (error) {
    console.error('Error creating A/B test:', error);
    return NextResponse.json(
      { error: 'Erro ao criar teste A/B' },
      { status: 500 }
    );
  }
}
