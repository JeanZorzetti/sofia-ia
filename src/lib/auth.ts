import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('[auth] CRITICAL: JWT_SECRET env var not set in production!')
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'sofia-next-jwt-secret-dev-only-change-in-production'
)
const JWT_EXPIRES_IN = '24h'
const COOKIE_NAME = 'sofia_token'

export interface JWTPayload {
  id: string
  email: string
  name: string
  role: string
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<{ user: JWTPayload; token: string } | null> {
  try {
    // Tentar autenticar contra o banco de dados primeiro
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: username },
          { name: username }
        ],
        status: 'active'
      }
    })

    if (dbUser) {
      const valid = await bcrypt.compare(password, dbUser.passwordHash)
      if (valid) {
        // Atualizar lastLogin
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { lastLogin: new Date() }
        })

        const payload: JWTPayload = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role
        }
        const token = await signToken(payload)
        return { user: payload, token }
      }
    }
  } catch (error) {
    console.error('Database authentication error:', error)
  }

  return null
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24h
  })
}

export async function clearAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value || null
}

export async function getAuthFromRequest(req: NextRequest): Promise<JWTPayload | null> {
  // Check cookie first
  const cookieToken = req.cookies.get(COOKIE_NAME)?.value
  if (cookieToken) {
    return verifyToken(cookieToken)
  }

  // Fallback to Authorization header
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return verifyToken(authHeader.slice(7))
  }

  return null
}

export async function getSessionUser(): Promise<JWTPayload | null> {
  const token = await getTokenFromCookies()
  if (!token) return null
  return verifyToken(token)
}
