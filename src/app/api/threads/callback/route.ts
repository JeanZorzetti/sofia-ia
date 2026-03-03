import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  ThreadsService,
} from '@/lib/integrations/threads';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?threads=error`);
  }

  // Threads OAuth não mantém state session-based — auth via cookie existente
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.redirect(`${appUrl}/login?redirect=/dashboard/settings`);
  }

  try {
    const redirectUri = `${appUrl}/api/threads/callback`;

    // Trocar code por short-lived token
    const shortToken = await exchangeCodeForToken(code, redirectUri);

    // Converter para long-lived token (60 dias)
    const longToken = await exchangeForLongLivedToken(shortToken.access_token);

    // Buscar perfil do usuário no Threads
    const service = new ThreadsService(longToken.access_token, 'me');
    const profile = await service.getProfile();

    if (!profile) {
      return NextResponse.redirect(`${appUrl}/dashboard/settings?threads=error`);
    }

    const expiresAt = new Date(Date.now() + longToken.expires_in * 1000);

    // Salvar ou atualizar conta Threads
    await prisma.threadsAccount.upsert({
      where: { userId: auth.id },
      update: {
        threadsUserId: profile.id,
        username: profile.username,
        accessToken: longToken.access_token,
        tokenExpiresAt: expiresAt,
      },
      create: {
        userId: auth.id,
        threadsUserId: profile.id,
        username: profile.username,
        accessToken: longToken.access_token,
        tokenExpiresAt: expiresAt,
      },
    });

    return NextResponse.redirect(`${appUrl}/dashboard/settings?threads=connected`);
  } catch (err) {
    console.error('[threads/callback] error:', err);
    return NextResponse.redirect(`${appUrl}/dashboard/settings?threads=error`);
  }
}
