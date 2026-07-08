import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'

// Redirects MUST come from the configured public URL: behind the EasyPanel proxy
// `request.url`'s host is the container's internal bind (0.0.0.0:3000), so
// `new URL('/dashboard', request.url)` sent users to https://0.0.0.0:3000/dashboard.
// Same base pattern as /api/auth/sso/google/callback.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://polarisia.com.br'

// GET /api/auth/google-finalize
// Chamado após OAuth do Google completar.
// Lê o JWT do NextAuth → emite nosso sofia_token → redireciona para /dashboard
export async function GET(request: NextRequest) {
  try {
    const nextAuthToken = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!nextAuthToken?.dbUserId) {
      return NextResponse.redirect(`${APP_URL}/login?error=oauth_failed`)
    }

    // Captura referral do cookie se for novo user
    const refCookie = request.cookies.get('sofia_ref')?.value

    const user = await prisma.user.findUnique({
      where: { id: nextAuthToken.dbUserId as string },
    })

    if (!user || user.status !== 'active') {
      return NextResponse.redirect(`${APP_URL}/login?error=account_inactive`)
    }

    // Se vier referral cookie e user ainda não tem referredBy, salva
    if (refCookie && !user.referredBy) {
      await prisma.user.update({
        where: { id: user.id },
        data: { referredBy: refCookie },
      }).catch(() => {}) // ignora se ref inválido
    }

    // Emite nosso JWT customizado (sofia_token) — mesmo formato das rotas existentes
    const polarisToken = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    const response = NextResponse.redirect(`${APP_URL}/dashboard`)
    response.cookies.set('sofia_token', polarisToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24h
    })

    return response
  } catch (error) {
    console.error('[google-finalize] Error:', error)
    return NextResponse.redirect(`${APP_URL}/login?error=server_error`)
  }
}
