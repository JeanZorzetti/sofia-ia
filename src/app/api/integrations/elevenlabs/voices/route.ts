import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { ElevenLabsService } from '@/lib/integrations/elevenlabs';

// POST /api/integrations/elevenlabs/voices - Lista vozes usando a API Key fornecida
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json() as { apiKey: string };
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key é obrigatória' }, { status: 400 });
    }

    const service = new ElevenLabsService({ apiKey });
    const voices = await service.listVoices();

    return NextResponse.json({ voices });
  } catch (error) {
    console.error('Error listing ElevenLabs voices:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar vozes' },
      { status: 500 }
    );
  }
}
