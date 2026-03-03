import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Webhook chamado pela Meta quando o usuário desconecta o app nas configurações do Threads.
 * Remove o token salvo do usuário correspondente.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // A Meta envia o Threads user ID no payload
    const threadsUserId = body?.user_id ?? body?.id;

    if (threadsUserId) {
      await prisma.threadsAccount.deleteMany({
        where: { threadsUserId: String(threadsUserId) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[threads/uninstall] error:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
