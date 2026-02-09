import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { chatWithSofia } from '@/lib/groq';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    let { messages, leadContext, customPrompt } = body;

    // Tentar carregar prompt customizado do banco de dados se não foi fornecido
    if (!customPrompt) {
      try {
        const setting = await prisma.setting.findUnique({
          where: {
            category_key: {
              category: 'sdr',
              key: 'custom_prompt'
            }
          }
        })

        if (setting && setting.value) {
          const settingValue = setting.value as any
          if (settingValue.enabled && settingValue.systemPrompt) {
            customPrompt = settingValue.systemPrompt
            console.log('✅ Usando prompt customizado do banco de dados')
          }
        }
      } catch (dbError) {
        console.error('❌ Erro ao carregar prompt customizado:', dbError)
        // Continua sem prompt customizado
      }
    }

    // Validation
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: 'messages is required and must be an array' },
        { status: 400 }
      );
    }

    // Validate message format
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return NextResponse.json(
          { success: false, error: 'Each message must have role and content properties' },
          { status: 400 }
        );
      }
      if (!['system', 'user', 'assistant'].includes(msg.role)) {
        return NextResponse.json(
          { success: false, error: 'Message role must be system, user, or assistant' },
          { status: 400 }
        );
      }
    }

    // Call Sofia AI
    const result = await chatWithSofia(messages, leadContext, customPrompt);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in AI chat:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process AI chat request' },
      { status: 500 }
    );
  }
}
