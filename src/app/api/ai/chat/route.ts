import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { chatWithSofia, chatWithAgent } from '@/lib/groq';
import { prisma } from '@/lib/prisma';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

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

    // Rate limit by user ID
    const rl = rateLimit(`ai_chat_${user.id}`, RATE_LIMITS.aiChat.max, RATE_LIMITS.aiChat.window);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please wait before sending more messages.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    // Parse and validate body
    const body = await request.json();
    let { messages, leadContext, customPrompt, agentId } = body;

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

    // Se agentId foi fornecido, usar chatWithAgent
    if (agentId) {
      const result = await chatWithAgent(agentId, messages, leadContext);
      return NextResponse.json({
        success: true,
        data: {
          content: result.message,
          model: result.model,
          usage: result.usage,
          confidence: result.confidence
        }
      });
    }

    // Caso contrário, tentar carregar prompt customizado do banco de dados
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

    // Call Sofia AI (compatibilidade com código legado)
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
