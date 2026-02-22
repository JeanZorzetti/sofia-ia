import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect /dashboard routes
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
  }

  // Protect /onboarding routes (must be logged in)
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
  }

  // Redirect authenticated users away from login
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
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/onboarding', '/login'],
}
