import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest, signToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

const ADMIN_TOKEN_COOKIE = 'sofia_admin_token'
const COOKIE_NAME = 'sofia_token'
const IMPERSONATING_COOKIE = 'sofia_impersonating'

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request)

  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await request.json()
  if (!userId) {
    return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 })
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, status: true },
  })

  if (!targetUser || targetUser.status !== 'active') {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
  }

  // Assinar token FRESCO para o admin (garante que usa o JWT_SECRET atual e tem nova expiração)
  const freshAdminToken = await signToken({
    id: auth.id,
    email: auth.email,
    name: auth.name,
    role: auth.role,
  })

  // Gerar novo token como o usuário alvo
  const userToken = await signToken({
    id: targetUser.id,
    email: targetUser.email,
    name: targetUser.name,
    role: targetUser.role,
  })

  const cookieStore = await cookies()
  const isProd = process.env.NODE_ENV === 'production'

  // Salvar token do admin para restaurar depois
  cookieStore.set(ADMIN_TOKEN_COOKIE, freshAdminToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8h
  })

  // Cookie não-httpOnly para o banner poder ler no cliente
  cookieStore.set(IMPERSONATING_COOKIE, auth.name || auth.email, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })

  // Substituir token ativo pelo do usuário
  cookieStore.set(COOKIE_NAME, userToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })

  return NextResponse.json({
    success: true,
    user: { id: targetUser.id, name: targetUser.name, email: targetUser.email },
  })
}
