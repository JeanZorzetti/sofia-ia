import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/ab-tests/[id] - Busca um teste específico
 */
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

    const test = await prisma.aBTest.findUnique({
      where: { id },
      include: {
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Teste não encontrado' }, { status: 404 });
    }

    // Calcular métricas
    const interactionsA = test.interactions.filter(i => i.variant === 'A');
    const interactionsB = test.interactions.filter(i => i.variant === 'B');

    const successA = interactionsA.filter(i => i.outcome === 'success').length;
    const successB = interactionsB.filter(i => i.outcome === 'success').length;

    const conversionRateA = interactionsA.length > 0 ? (successA / interactionsA.length) * 100 : 0;
    const conversionRateB = interactionsB.length > 0 ? (successB / interactionsB.length) * 100 : 0;

    // Buscar nomes dos agentes
    const [agentA, agentB] = await Promise.all([
      prisma.agent.findUnique({ where: { id: test.agentAId }, select: { name: true, description: true } }),
      prisma.agent.findUnique({ where: { id: test.agentBId }, select: { name: true, description: true } }),
    ]);

    const metrics = {
      totalInteractions: test.interactions.length,
      variantA: {
        interactions: interactionsA.length,
        successes: successA,
        conversionRate: Math.round(conversionRateA * 100) / 100,
        agent: agentA,
      },
      variantB: {
        interactions: interactionsB.length,
        successes: successB,
        conversionRate: Math.round(conversionRateB * 100) / 100,
        agent: agentB,
      },
    };

    return NextResponse.json({
      test: {
        ...test,
        agentAName: agentA?.name,
        agentBName: agentB?.name,
      },
      metrics,
    });
  } catch (error) {
    console.error('Error fetching A/B test:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar teste' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ab-tests/[id] - Atualiza um teste
 */
export async function PUT(
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
    const { name, description, trafficSplit, status } = body;

    const test = await prisma.aBTest.findUnique({ where: { id } });

    if (!test) {
      return NextResponse.json({ error: 'Teste não encontrado' }, { status: 404 });
    }

    const updatedTest = await prisma.aBTest.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(trafficSplit && { trafficSplit }),
        ...(status && { status }),
      },
    });

    return NextResponse.json({ test: updatedTest });
  } catch (error) {
    console.error('Error updating A/B test:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar teste' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ab-tests/[id] - Remove um teste
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const test = await prisma.aBTest.findUnique({ where: { id } });

    if (!test) {
      return NextResponse.json({ error: 'Teste não encontrado' }, { status: 404 });
    }

    await prisma.aBTest.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting A/B test:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar teste' },
      { status: 500 }
    );
  }
}
