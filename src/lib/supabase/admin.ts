import { createClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client using the secret (service role) key.
 *
 * Bypasses RLS, so it is what every write in `actions/` runs through — several
 * tables (the permission matrix in particular) deliberately ship SELECT-only
 * policies and expect mutations to come from here.
 *
 * Supabase renamed this key from SUPABASE_SERVICE_ROLE_KEY to SUPABASE_SECRET_KEY;
 * both are accepted so existing deployments keep working, same as the migration
 * scripts under /scripts.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

  if (!url || !secretKey) {
    throw new Error('Missing SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) env var')
  }

  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
