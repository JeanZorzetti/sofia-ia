import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/ab-tests/[id]/stop - Para um teste A/B e calcula o vencedor
 */
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

    const test = await prisma.aBTest.findUnique({
      where: { id },
      include: {
        interactions: true,
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Teste não encontrado' }, { status: 404 });
    }

    if (test.status !== 'running') {
      return NextResponse.json({ error: 'Teste não está em execução' }, { status: 400 });
    }

    // Calcular vencedor baseado em taxa de conversão
    const interactionsA = test.interactions.filter(i => i.variant === 'A');
    const interactionsB = test.interactions.filter(i => i.variant === 'B');

    const successA = interactionsA.filter(i => i.outcome === 'success').length;
    const successB = interactionsB.filter(i => i.outcome === 'success').length;

    const conversionRateA = interactionsA.length > 0 ? successA / interactionsA.length : 0;
    const conversionRateB = interactionsB.length > 0 ? successB / interactionsB.length : 0;

    let winnerAgentId: string | null = null;

    if (conversionRateA > conversionRateB) {
      winnerAgentId = test.agentAId;
    } else if (conversionRateB > conversionRateA) {
      winnerAgentId = test.agentBId;
    }
    // Se empate, deixa null

    const updatedTest = await prisma.aBTest.update({
      where: { id },
      data: {
        status: 'completed',
        endedAt: new Date(),
        winnerAgentId,
        totalInteractions: test.interactions.length,
      },
    });

    return NextResponse.json({
      test: updatedTest,
      results: {
        variantA: {
          interactions: interactionsA.length,
          successes: successA,
          conversionRate: Math.round(conversionRateA * 10000) / 100,
        },
        variantB: {
          interactions: interactionsB.length,
          successes: successB,
          conversionRate: Math.round(conversionRateB * 10000) / 100,
        },
        winner: winnerAgentId === test.agentAId ? 'A' : winnerAgentId === test.agentBId ? 'B' : 'Empate',
      },
    });
  } catch (error) {
    console.error('Error stopping A/B test:', error);
    return NextResponse.json(
      { error: 'Erro ao parar teste' },
      { status: 500 }
    );
  }
}
