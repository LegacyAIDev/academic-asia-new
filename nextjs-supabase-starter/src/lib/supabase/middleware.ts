import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ╔═══════════════════════════════════════════════════════════════════════════╗
  // ║ CRITICAL: Do NOT put any code between createServerClient and getUser()    ║
  // ║ A simple mistake here can cause random logouts that are very hard to debug║
  // ╚═══════════════════════════════════════════════════════════════════════════╝

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Define public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/auth']
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (!user && !isPublicRoute) {
    // No user and trying to access protected route - redirect to login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isPublicRoute) {
    // User is logged in but on auth page - redirect to dashboard
    const url = request.nextUrl.clone()
    url.pathname = '/students'
    return NextResponse.redirect(url)
  }

  // ╔═══════════════════════════════════════════════════════════════════════════╗
  // ║ CRITICAL: You MUST return supabaseResponse object as-is.                  ║
  // ║ If you're creating a new response object, make sure to:                   ║
  // ║ 1. Pass the request: NextResponse.next({ request })                       ║
  // ║ 2. Copy cookies: myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll()) ║
  // ╚═══════════════════════════════════════════════════════════════════════════╝

  return supabaseResponse
}
