import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/** Routes that don't require authentication */
const publicRoutes = ['/login', '/forgot-password', '/reset-password', '/auth/callback']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  const { user, supabaseResponse } = await updateSession(request)

  // Authenticated user on login page → redirect to dashboard
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    const res = NextResponse.redirect(url)
    res.headers.set('Cache-Control', 'private, no-store')
    return res
  }

  // Unauthenticated user on protected route → redirect to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const res = NextResponse.redirect(url)
    res.headers.set('Cache-Control', 'private, no-store')
    return res
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
