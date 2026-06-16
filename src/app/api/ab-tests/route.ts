import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ownerId } from '@/lib/authz';

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
      where: { createdBy: ownerId(auth) },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { interactions: true }
        }
      }
    });

    // Buscar nomes dos agentes em lote (Sprint 2: era 3 queries por teste — N+1).
    const agentIds = new Set<string>();
    for (const test of tests) {
      agentIds.add(test.agentAId);
      agentIds.add(test.agentBId);
      if (test.winnerAgentId) agentIds.add(test.winnerAgentId);
    }

    const agents = agentIds.size
      ? await prisma.agent.findMany({
          where: { id: { in: [...agentIds] } },
          select: { id: true, name: true },
        })
      : [];
    const nameById = new Map(agents.map((a) => [a.id, a.name]));

    const testsWithAgentNames = tests.map((test) => ({
      ...test,
      agentAName: nameById.get(test.agentAId) || 'Unknown',
      agentBName: nameById.get(test.agentBId) || 'Unknown',
      winnerAgentName: test.winnerAgentId ? nameById.get(test.winnerAgentId) || null : null,
      interactionsCount: test._count.interactions,
    }));

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
      prisma.agent.findFirst({ where: { id: agentAId, createdBy: ownerId(auth) } }),
      prisma.agent.findFirst({ where: { id: agentBId, createdBy: ownerId(auth) } }),
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
