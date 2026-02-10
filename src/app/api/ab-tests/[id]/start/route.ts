import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/ab-tests/[id]/start - Inicia um teste A/B
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

    const test = await prisma.aBTest.findUnique({ where: { id } });

    if (!test) {
      return NextResponse.json({ error: 'Teste não encontrado' }, { status: 404 });
    }

    if (test.status === 'running') {
      return NextResponse.json({ error: 'Teste já está em execução' }, { status: 400 });
    }

    if (test.status === 'completed') {
      return NextResponse.json({ error: 'Teste já foi concluído' }, { status: 400 });
    }

    const updatedTest = await prisma.aBTest.update({
      where: { id },
      data: {
        status: 'running',
        startedAt: new Date(),
      },
    });

    return NextResponse.json({ test: updatedTest });
  } catch (error) {
    console.error('Error starting A/B test:', error);
    return NextResponse.json(
      { error: 'Erro ao iniciar teste' },
      { status: 500 }
    );
  }
}
