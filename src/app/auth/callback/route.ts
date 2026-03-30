import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

type CookieToSet = { name: string; value: string; options: CookieOptions }

async function getSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Can be ignored in Server Component context
          }
        },
      },
    },
  )
}

/** Handle auth callback — exchanges code or verifies token for session */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'recovery' | 'signup' | 'invite' | 'email' | null
  const next = searchParams.get('next') ?? '/'

  const redirectTo = next.startsWith('/') ? next : '/'

  const supabase = await getSupabaseClient()

  // PKCE flow: exchange authorization code for session
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  // Token hash flow: verify OTP (password reset, email confirmation, invite)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  // On failure, redirect to login with error context
  return NextResponse.redirect(`${origin}/login?error=link_expired`)
}
