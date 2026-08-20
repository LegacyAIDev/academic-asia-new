'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAccess, assertNoEscalation, assertOutranksTarget } from '@/lib/permissions/guard'
import { getCurrentUser } from '@/lib/supabase/auth'
import { ACCESS, MODULES } from '@/lib/permissions/modules'

type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Staff profile writes go through the service role client.
 *
 * The `profiles` RLS policy only allows a user to update their own row
 * (auth.uid() = id), so a session client editing a colleague matches zero rows
 * and PostgREST reports no error — the UI would show "saved" while nothing
 * changed. Service role bypasses RLS so department/admin_level edits persist.
 *
 * Because service role bypasses RLS entirely, the `assertAccess` guard at the
 * top of each action is the only thing standing between a caller and every
 * staff record. Anti-escalation rules on admin_level live in updateStaff.
 */

export type StaffInput = {
  first_name: string
  surname: string
  email_1?: string | null
  email_2?: string | null
  telephone?: string | null
  mobile?: string | null
  fax?: string | null
  department_id?: number | null
  admin_level?: number | null
  position?: string | null
  join_date?: string | null
  yearly_case_count?: number | null
  weekly_case_count?: number | null
  daily_case_count?: number | null
  remarks?: string | null
  password?: string | null
}

/** Create a new staff member: creates auth user first, then profile linked to it */
export async function createStaff(input: StaffInput): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.STAFF, ACCESS.WRITE)
  if (denied) return denied

  try {
    const { password, ...profileData } = input

    if (!profileData.email_1) {
      return { success: false, error: 'Email is required to create a staff account.' }
    }

    // Without this, staff:WRITE is equivalent to Super Admin — the holder could
    // simply assign themselves a higher level.
    const caller = await getCurrentUser()
    const escalation = await assertNoEscalation(caller?.admin_level ?? null, {
      adminLevel: profileData.admin_level,
    })
    if (escalation) return escalation

    // Step 1: Create auth user with the service role client
    const admin = createAdminClient()
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: profileData.email_1,
      password: password || undefined,
      email_confirm: true,
      user_metadata: {
        first_name: profileData.first_name,
        surname: profileData.surname,
      },
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return { success: false, error: authError.message }
    }

    // Step 2: Update the auto-created profile with staff details
    // The DB trigger creates a bare profile on auth.users insert,
    // so we update it with the full staff data
    const { data: created, error: profileError } = await admin
      .from('profiles')
      .update(profileData)
      .eq('id', authUser.user.id)
      .select('id')

    if (profileError) {
      console.error('Error updating staff profile:', profileError)
      return { success: false, error: profileError.message }
    }

    if (!created?.length) {
      console.error('Auth user created but no profile row was written:', authUser.user.id)
      return { success: false, error: 'Account created but profile details could not be saved.' }
    }

    revalidatePath('/staff')
    return { success: true, data: { id: authUser.user.id } }
  } catch (err) {
    console.error('Error in createStaff:', err)
    return { success: false, error: 'Failed to create staff member' }
  }
}

/** Update an existing staff profile */
export async function updateStaff(id: string, input: Partial<StaffInput>): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.STAFF, ACCESS.WRITE)
  if (denied) return denied

  try {
    const { password, ...profileData } = input

    // Two separate checks. The first stops you editing someone more senior at
    // all — including their password and login email, which the second would
    // miss entirely if the payload just left admin_level out.
    const outranked = await assertOutranksTarget(id)
    if (outranked) return outranked

    // The second stops you handing out a level above your own.
    const caller = await getCurrentUser()
    const escalation = await assertNoEscalation(caller?.admin_level ?? null, {
      adminLevel: profileData.admin_level,
    })
    if (escalation) return escalation

    const admin = createAdminClient()

    const { data: updated, error } = await admin
      .from('profiles')
      .update({ ...profileData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')

    if (error) {
      console.error('Error updating staff:', error)
      return { success: false, error: error.message }
    }

    // A zero-row update means the id no longer exists — never report that as saved
    if (!updated?.length) {
      return { success: false, error: 'Staff member not found.' }
    }

    // Update auth email if changed
    if (profileData.email_1) {
      const { error: emailError } = await admin.auth.admin.updateUserById(id, { email: profileData.email_1 })
      if (emailError) {
        console.error('Error updating staff auth email:', emailError)
        return { success: false, error: `Profile saved, but login email was not changed: ${emailError.message}` }
      }
    }

    // Update password if provided
    if (password) {
      const { error: passwordError } = await admin.auth.admin.updateUserById(id, { password })
      if (passwordError) {
        console.error('Error updating staff password:', passwordError)
        return { success: false, error: `Profile saved, but password was not changed: ${passwordError.message}` }
      }
    }

    revalidatePath('/staff')
    revalidatePath(`/staff/${id}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateStaff:', err)
    return { success: false, error: 'Failed to update staff member' }
  }
}

/** Delete a staff profile and its auth user */
export async function deleteStaff(id: string): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.STAFF, ACCESS.WRITE)
  if (denied) return denied

  try {
    // staff:WRITE alone must not be enough to delete an administrator
    const outranked = await assertOutranksTarget(id)
    if (outranked) return outranked

    // Delete auth user first (cascade will handle profile via FK)
    const admin = createAdminClient()
    const { error: authError } = await admin.auth.admin.deleteUser(id)

    if (authError) {
      console.error('Error deleting auth user:', authError)
      // Continue to delete profile even if auth user doesn't exist
    }

    // Usually a no-op because the FK cascade already removed the row;
    // kept for profiles orphaned from their auth user
    const { error } = await admin
      .from('profiles')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting staff:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/staff')
    return { success: true }
  } catch (err) {
    console.error('Error in deleteStaff:', err)
    return { success: false, error: 'Failed to delete staff member' }
  }
}
