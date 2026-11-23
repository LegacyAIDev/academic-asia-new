'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { getCurrentUser } from '@/lib/supabase/auth'
import { LINK_DAYS, hashRegistrationToken, newRegistrationToken } from '@/lib/registration/registration-form'

type ActionResult<T = void> = { success: boolean; data?: T; error?: string }

/**
 * A new registration link for one family. The secret is returned once, for
 * staff to copy and send; only its hash is kept.
 */
export async function createRegistrationLink(note: string): Promise<ActionResult<{ token: string; expiresAt: string }>> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'You must be signed in.' }
    const token = newRegistrationToken()
    const expiresAt = new Date(Date.now() + LINK_DAYS * 24 * 3600 * 1000).toISOString()
    const supabase = createClient(await cookies())
    const { error } = await supabase.from('registration_links').insert({
      token_hash: hashRegistrationToken(token),
      note: note.trim().slice(0, 120) || null,
      created_by: user.id,
      expires_at: expiresAt,
    })
    if (error) {
      console.error('Error creating registration link:', error)
      return { success: false, error: 'Could not create the link. Please try again.' }
    }
    return { success: true, data: { token, expiresAt } }
  } catch (err) {
    console.error('Error in createRegistrationLink:', err)
    return { success: false, error: 'Could not create the link. Please try again.' }
  }
}
