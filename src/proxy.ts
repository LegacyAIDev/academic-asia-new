import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy-session'

/** Routes that don't require authentication. /register is the families' online form, opened with a one-use link. */
const publicRoutes = ['/login', '/forgot-password', '/reset-password', '/auth/callback', '/register/']

/**
 * Runs before every page, RSC fetch and server action. Next 16's proxy runs on
 * Node in the app's own region (next to the database), not at an edge near the
 * user, so the session check below is a short hop rather than a round trip from
 * Hong Kong to Europe.
 */
export async function proxy(request: NextRequest) {
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
