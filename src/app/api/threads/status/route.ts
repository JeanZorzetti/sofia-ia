import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET — status da conexão
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const account = await prisma.threadsAccount.findUnique({
    where: { userId: auth.id },
    select: {
      username: true,
      tokenExpiresAt: true,
      createdAt: true,
    },
  });

  if (!account) {
    return NextResponse.json({ success: true, data: { connected: false } });
  }

  const tokenExpired = account.tokenExpiresAt ? account.tokenExpiresAt < new Date() : false;

  return NextResponse.json({
    success: true,
    data: {
      connected: true,
      username: account.username,
      tokenExpired,
      tokenExpiresAt: account.tokenExpiresAt,
      connectedAt: account.createdAt,
    },
  });
}

// DELETE — desconectar conta Threads
export async function DELETE(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.threadsAccount.deleteMany({ where: { userId: auth.id } });

  return NextResponse.json({ success: true });
}
