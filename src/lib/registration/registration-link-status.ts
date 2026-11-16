import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashRegistrationToken, looksLikeToken } from './registration-form'

/** Whether a registration link can still be used, for the public page to decide what to show. */
export async function registrationLinkStatus(token: string): Promise<'open' | 'spent'> {
  if (!looksLikeToken(token)) return 'spent'
  const { data, error } = await createAdminClient()
    .from('registration_links' as never)
    .select('id')
    .eq('token_hash', hashRegistrationToken(token))
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (error) console.error('Error checking registration link:', error)
  return data ? 'open' : 'spent'
}
