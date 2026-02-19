import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

/**
 * ⚠️ DANGER: This client bypasses Row Level Security
 * Only use on trusted server-side code (API routes, server actions)
 * NEVER expose to browser or import in client components
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('SERVICE_ROLE_KEY is not set')
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
