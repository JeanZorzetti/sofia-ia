import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

const ADMIN_TOKEN_COOKIE = 'sofia_admin_token'
const COOKIE_NAME = 'sofia_token'
const IMPERSONATING_COOKIE = 'sofia_impersonating'

export async function POST(request: NextRequest) {
  const adminToken = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value

  if (!adminToken) {
    return NextResponse.json({ success: false, error: 'No admin session to restore' }, { status: 400 })
  }

  // Verificar que o token original ainda é válido e é admin
  const adminPayload = await verifyToken(adminToken)
  if (!adminPayload || adminPayload.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Invalid admin token' }, { status: 403 })
  }

  const cookieStore = await cookies()
  const isProd = process.env.NODE_ENV === 'production'

  // Restaurar token do admin
  cookieStore.set(COOKIE_NAME, adminToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  })

  // Limpar cookies de impersonação
  cookieStore.delete(ADMIN_TOKEN_COOKIE)
  cookieStore.delete(IMPERSONATING_COOKIE)

  return NextResponse.json({ success: true })
}
