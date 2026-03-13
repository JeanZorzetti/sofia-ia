import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { ElevenLabsService } from '@/lib/integrations/elevenlabs';

// POST /api/tts - Gera áudio a partir de texto usando ElevenLabs
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json() as {
      text: string;
      voiceId?: string;
      modelId?: string;
    };

    const { text, voiceId, modelId } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Texto é obrigatório' }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: 'Texto muito longo (máximo 5000 caracteres)' }, { status: 400 });
    }

    // Buscar configuração do ElevenLabs
    const integration = await prisma.integration.findFirst({
      where: { type: 'elevenlabs', status: 'active' },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Integração ElevenLabs não configurada ou inativa' },
        { status: 404 }
      );
    }

    const creds = integration.credentials as Record<string, string>;
    const config = integration.config as Record<string, unknown>;

    if (!creds.apiKey) {
      return NextResponse.json(
        { error: 'API Key do ElevenLabs não configurada' },
        { status: 400 }
      );
    }

    const service = new ElevenLabsService({
      apiKey: creds.apiKey,
      voiceId: (voiceId || config.voiceId) as string | undefined,
      modelId: (modelId || config.modelId) as string | undefined,
      stability: config.stability ? Number(config.stability) / 100 : 0.5,
      similarityBoost: config.similarityBoost ? Number(config.similarityBoost) / 100 : 0.75,
    });

    const audioBuffer = await service.textToSpeech({ text, voiceId, modelId });

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'inline; filename="speech.mp3"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating TTS:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao gerar áudio' },
      { status: 500 }
    );
  }
}
