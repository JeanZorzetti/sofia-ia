import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getGroqClient } from '@/lib/ai/groq';
import { ThreadsService } from '@/lib/integrations/threads';

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const account = await prisma.threadsAccount.findUnique({
    where: { userId: auth.id },
  });

  if (!account) {
    return NextResponse.json(
      { success: false, error: 'Threads account not connected' },
      { status: 400 }
    );
  }

  if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
    return NextResponse.json(
      { success: false, error: 'Threads token expired. Please reconnect.' },
      { status: 401 }
    );
  }

  let body: {
    prompt: string;
    context?: string;
    systemPrompt?: string;
    imageUrl?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.prompt?.trim()) {
    return NextResponse.json({ success: false, error: 'prompt is required' }, { status: 400 });
  }

  // Gerar texto com Groq
  const groq = getGroqClient();

  const systemPrompt =
    body.systemPrompt ||
    `Você é um redator especialista em redes sociais.
Crie um post para o Threads (rede social da Meta) com base no prompt fornecido.
Regras:
- Máximo 500 caracteres
- Tom autêntico, direto e envolvente
- Sem hashtags excessivas (máximo 3)
- Não use emojis em excesso
- Responda APENAS com o texto do post, sem explicações adicionais`;

  const userMessage = body.context
    ? `${body.prompt}\n\nContexto adicional:\n${body.context}`
    : body.prompt;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 300,
    temperature: 0.8,
  });

  const generatedText = completion.choices[0]?.message?.content?.trim();

  if (!generatedText) {
    return NextResponse.json(
      { success: false, error: 'AI failed to generate content' },
      { status: 502 }
    );
  }

  // Publicar no Threads
  const service = new ThreadsService(account.accessToken, account.threadsUserId);
  const result = await service.publish({
    text: generatedText,
    imageUrl: body.imageUrl,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, generatedText },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      postId: result.postId,
      generatedText,
    },
  });
}
