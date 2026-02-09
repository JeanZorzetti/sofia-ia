import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { executeIntegrationAction } from '@/lib/integration-service';

// POST /api/integrations/[id]/execute - Execute integration action
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
    const body = await request.json();
    const { action, params: actionParams } = body;

    if (!action || !actionParams) {
      return NextResponse.json(
        { error: 'Action e params são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await executeIntegrationAction(id, action, actionParams);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error executing integration action:', error);
    return NextResponse.json(
      { error: 'Erro ao executar ação de integração' },
      { status: 500 }
    );
  }
}
