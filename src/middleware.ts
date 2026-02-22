import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

/**
 * Middleware de autenticacao e tenant isolation
 *
 * Responsabilidades:
 * 1. Proteger rotas /dashboard/* e /onboarding — redirecionar para /login se nao autenticado
 * 2. Proteger rotas /api/* — retornar 401 se nao autenticado
 * 3. Injetar headers x-user-id e x-org-id em todas as requests autenticadas
 *    para que API routes possam filtrar dados sem reler o token
 * 4. Bloquear acesso cruzado (single-tenant por enquanto, preparado para SaaS)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ------------------------------------------------------------------
  // Helper: resolve user from token (cookie ou Authorization header)
  // ------------------------------------------------------------------
  async function resolveUser() {
    const cookieToken = request.cookies.get('sofia_token')?.value
    if (cookieToken) return verifyToken(cookieToken)

    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      return verifyToken(authHeader.slice(7))
    }
    return null
  }

  // ------------------------------------------------------------------
  // Helper: attach tenant identity headers to a passing response
  // ------------------------------------------------------------------
  function withTenantHeaders(
    response: NextResponse,
    userId: string,
    orgId: string
  ): NextResponse {
    response.headers.set('x-user-id', userId)
    response.headers.set('x-org-id', orgId)
    return response
  }

  // ------------------------------------------------------------------
  // Protect /dashboard/* — browser navigation, redirect to /login
  // ------------------------------------------------------------------
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('sofia_token')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const user = await verifyToken(token)
    if (!user) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('sofia_token')
      return response
    }

    // Inject tenant headers for downstream use
    const next = NextResponse.next()
    // orgId: for single-tenant systems, orgId = userId; prepared for SaaS
    const orgId = (user as any).orgId || user.id
    return withTenantHeaders(next, user.id, orgId)
  }

  // ------------------------------------------------------------------
  // Protect /admin — browser navigation, redirect to /login
  // ------------------------------------------------------------------
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const token = request.cookies.get('sofia_token')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const user = await verifyToken(token)
    if (!user) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('sofia_token')
      return response
    }
    const next = NextResponse.next()
    const orgId = (user as any).orgId || user.id
    return withTenantHeaders(next, user.id, orgId)
  }

  // ------------------------------------------------------------------
  // Protect /onboarding/* — browser navigation, redirect to /login
  // ------------------------------------------------------------------
  if (pathname.startsWith('/onboarding')) {
    const token = request.cookies.get('sofia_token')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const user = await verifyToken(token)
    if (!user) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('sofia_token')
      return response
    }

    const next = NextResponse.next()
    const orgId = (user as any).orgId || user.id
    return withTenantHeaders(next, user.id, orgId)
  }

  // ------------------------------------------------------------------
  // Protect /api/* routes — JSON 401 response (not redirect)
  // Public exceptions: /api/auth/* (login/register), /api/health,
  //                    /api/webhooks/* (external callbacks)
  // ------------------------------------------------------------------
  if (pathname.startsWith('/api/')) {
    const isPublicApi =
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/api/health') ||
      pathname.startsWith('/api/webhooks') ||
      pathname.startsWith('/api/mercadopago') || // payment gateway callbacks
      pathname.startsWith('/api/crm') || // CRM leads (public form submissions)
      pathname.startsWith('/api/newsletter') || // newsletter subscriptions
      pathname.startsWith('/api/public/') // public API (auth via api_key header)

    if (!isPublicApi) {
      const user = await resolveUser()

      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        )
      }

      // Inject tenant headers for API route handlers
      const next = NextResponse.next()
      const orgId = (user as any).orgId || user.id
      return withTenantHeaders(next, user.id, orgId)
    }
  }

  // ------------------------------------------------------------------
  // Redirect authenticated users away from /login
  // ------------------------------------------------------------------
  if (pathname === '/login') {
    const token = request.cookies.get('sofia_token')?.value
    if (token) {
      const user = await verifyToken(token)
      if (user) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin',
    '/admin/:path*',
    '/onboarding/:path*',
    '/onboarding',
    '/login',
    '/api/:path*',
  ],
}
