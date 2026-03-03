import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * Webhook de exclusão de dados exigido pela Meta (compliance LGPD/GDPR).
 * A Meta envia um signed_request; deve-se retornar um JSON de confirmação.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const signedRequest = formData.get('signed_request') as string | null;

    if (!signedRequest) {
      return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 });
    }

    const [encodedSig, payload] = signedRequest.split('.');
    const decodedPayload = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf-8')
    );

    // Verificar assinatura HMAC-SHA256
    const expectedSig = crypto
      .createHmac('sha256', process.env.THREADS_APP_SECRET!)
      .update(payload)
      .digest('base64url');

    if (encodedSig !== expectedSig) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const threadsUserId = decodedPayload.user_id;

    // Deletar dados do usuário
    if (threadsUserId) {
      await prisma.threadsAccount.deleteMany({
        where: { threadsUserId: String(threadsUserId) },
      });
    }

    // A Meta exige este formato de resposta
    const confirmationCode = crypto.randomBytes(8).toString('hex');
    const statusUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/threads/delete/status?id=${confirmationCode}`;

    return NextResponse.json({
      url: statusUrl,
      confirmation_code: confirmationCode,
    });
  } catch (err) {
    console.error('[threads/delete] error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Endpoint de status exigido pela Meta após confirmação de exclusão
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  return NextResponse.json({
    id,
    status: 'complete',
  });
}
