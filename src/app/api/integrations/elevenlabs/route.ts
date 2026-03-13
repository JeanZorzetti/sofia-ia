import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

// GET /api/integrations/elevenlabs - Busca configuração existente
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const integration = await prisma.integration.findFirst({
      where: { type: 'elevenlabs' },
    });

    if (!integration) {
      return NextResponse.json({ integration: null });
    }

    // Não retornar credenciais sensíveis
    const { credentials, ...safe } = integration;
    const creds = credentials as Record<string, unknown>;
    return NextResponse.json({
      integration: {
        ...safe,
        hasCredentials: !!creds?.apiKey,
      },
    });
  } catch (error) {
    console.error('Error fetching ElevenLabs config:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST /api/integrations/elevenlabs - Cria ou atualiza configuração
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json() as {
      apiKey: string;
      voiceId?: string;
      modelId?: string;
      stability?: number;
      similarityBoost?: number;
    };

    const { apiKey, voiceId, modelId, stability, similarityBoost } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key é obrigatória' }, { status: 400 });
    }

    const configData = {
      voiceId: voiceId || '21m00Tcm4TlvDq8ikWAM',
      modelId: modelId || 'eleven_multilingual_v2',
      stability: stability ?? 50,
      similarityBoost: similarityBoost ?? 75,
    };

    const existing = await prisma.integration.findFirst({
      where: { type: 'elevenlabs' },
    });

    if (existing) {
      const updated = await prisma.integration.update({
        where: { id: existing.id },
        data: {
          config: configData,
          credentials: { apiKey },
          status: 'active',
        },
      });
      return NextResponse.json({ success: true, id: updated.id });
    }

    const created = await prisma.integration.create({
      data: {
        name: 'ElevenLabs TTS',
        type: 'elevenlabs',
        config: configData,
        credentials: { apiKey },
        status: 'active',
      },
    });

    return NextResponse.json({ success: true, id: created.id }, { status: 201 });
  } catch (error) {
    console.error('Error saving ElevenLabs config:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
