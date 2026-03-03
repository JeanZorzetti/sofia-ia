import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ThreadsService, ThreadsPostOptions } from '@/lib/integrations/threads';

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

  // Verificar se token não expirou
  if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
    return NextResponse.json(
      { success: false, error: 'Threads token expired. Please reconnect.' },
      { status: 401 }
    );
  }

  let body: ThreadsPostOptions;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.text?.trim()) {
    return NextResponse.json({ success: false, error: 'text is required' }, { status: 400 });
  }

  const service = new ThreadsService(account.accessToken, account.threadsUserId);
  const result = await service.publish(body);

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 502 });
  }

  return NextResponse.json({ success: true, data: { postId: result.postId } });
}
