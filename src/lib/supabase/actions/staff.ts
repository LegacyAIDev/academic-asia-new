'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

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
  try {
    const { password, ...profileData } = input

    if (!profileData.email_1) {
      return { success: false, error: 'Email is required to create a staff account.' }
    }

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
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', authUser.user.id)

    if (profileError) {
      console.error('Error updating staff profile:', profileError)
      return { success: false, error: profileError.message }
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
  try {
    const { password, ...profileData } = input
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('profiles')
      .update({ ...profileData, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error updating staff:', error)
      return { success: false, error: error.message }
    }

    // Update auth email if changed
    if (profileData.email_1) {
      const admin = createAdminClient()
      await admin.auth.admin.updateUserById(id, { email: profileData.email_1 })
    }

    // Update password if provided
    if (password) {
      const admin = createAdminClient()
      await admin.auth.admin.updateUserById(id, { password })
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
  try {
    // Delete auth user first (cascade will handle profile via FK)
    const admin = createAdminClient()
    const { error: authError } = await admin.auth.admin.deleteUser(id)

    if (authError) {
      console.error('Error deleting auth user:', authError)
      // Continue to delete profile even if auth user doesn't exist
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
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
