import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

type CookieToSet = { name: string; value: string; options?: CookieOptions }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

/** Refresh the auth session and return user + response with updated cookies */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    },
  )

  // Refreshes the session when it has expired, which is what keeps the user
  // signed in. getClaims verifies the token against the project's signing keys
  // without a call to the Auth server when the project uses asymmetric keys;
  // with the older shared secret it falls back to asking the Auth server.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims ? { id: data.claims.sub } : null

  return { user, supabaseResponse }
}
