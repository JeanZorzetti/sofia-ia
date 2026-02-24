import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'

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
      return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url))
    }

    const user = await prisma.user.findUnique({
      where: { id: nextAuthToken.dbUserId as string },
    })

    if (!user || user.status !== 'active') {
      return NextResponse.redirect(new URL('/login?error=account_inactive', request.url))
    }

    // Emite nosso JWT customizado (sofia_token) — mesmo formato das rotas existentes
    const sofiaToken = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    response.cookies.set('sofia_token', sofiaToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24h
    })

    return response
  } catch (error) {
    console.error('[google-finalize] Error:', error)
    return NextResponse.redirect(new URL('/login?error=server_error', request.url))
  }
}
