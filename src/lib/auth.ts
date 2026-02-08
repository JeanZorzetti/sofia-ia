import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'sofia-next-jwt-secret-2026-roilabs'
)
const JWT_EXPIRES_IN = '24h'
const COOKIE_NAME = 'sofia_token'

export interface JWTPayload {
  id: number
  username: string
  role: 'admin' | 'user'
}

// Temporary users (same as original project)
const USERS = [
  {
    id: 1,
    username: 'admin',
    passwordHash: '$2a$10$5nHSoyKgmnNQzIY9nkuYIOL/P.yUB7AB.vzhP475OitOtRmuTG.fC', // SofiaAI2024#Admin
    role: 'admin' as const,
  },
  {
    id: 2,
    username: 'sofia',
    passwordHash: '$2a$10$5nHSoyKgmnNQzIY9nkuYIOL/P.yUB7AB.vzhP475OitOtRmuTG.fC', // SofiaAI2024#Admin
    role: 'user' as const,
  },
]

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
  const user = USERS.find((u) => u.username === username)
  if (!user) return null

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return null

  const payload: JWTPayload = { id: user.id, username: user.username, role: user.role }
  const token = await signToken(payload)
  return { user: payload, token }
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
