'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'

type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

export type CreateSchoolContactInput = {
  school_id: string
  position?: string | null
  surname?: string | null
  first_name?: string | null
  title?: string | null
  gender?: string | null
  telephone?: string | null
  mobile?: string | null
  fax?: string | null
  email_1?: string | null
  email_2?: string | null
  email_3?: string | null
  address_1?: string | null
  address_2?: string | null
  priority?: number | null
  responsible?: string | null
  remarks?: string | null
  is_active?: boolean
}

export type SchoolContactOption = {
  id: string
  school_id: string
  first_name: string | null
  surname: string | null
  position: string | null
  school_name: string | null
}

/** Fetch contacts for multiple schools (for representative dropdown) */
export async function getContactsForSchools(schoolIds: string[]): Promise<SchoolContactOption[]> {
  const denied = await assertAccess(MODULES.SCHOOLS, ACCESS.READ)
  // Denied resolves to an empty list: this returns rows, not an ActionResult,
  // and the page guard already blocks anyone who should not see them.
  if (denied) return []

  if (schoolIds.length === 0) return []
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('school_contacts')
      .select('id, school_id, first_name, surname, position, school:schools(name)')
      .in('school_id', schoolIds)
      .order('first_name')

    if (error) {
      console.error('Error fetching contacts for schools:', error)
      return []
    }

    return (data ?? []).map((c) => {
      const raw = c as Record<string, unknown>
      const school = raw.school as { name: string } | { name: string }[] | null
      return {
        id: raw.id as string,
        school_id: raw.school_id as string,
        first_name: raw.first_name as string | null,
        surname: raw.surname as string | null,
        position: raw.position as string | null,
        school_name: Array.isArray(school) ? school[0]?.name ?? null : school?.name ?? null,
      }
    })
  } catch (err) {
    console.error('Error in getContactsForSchools:', err)
    return []
  }
}

/** Create a new school contact */
export async function createSchoolContact(
  input: CreateSchoolContactInput
): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.SCHOOLS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('school_contacts')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating school contact:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${input.school_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createSchoolContact:', err)
    return { success: false, error: 'Failed to create contact' }
  }
}

/** Update an existing school contact */
export async function updateSchoolContact(
  contactId: string,
  schoolId: string,
  input: Partial<Omit<CreateSchoolContactInput, 'school_id'>>
): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.SCHOOLS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('school_contacts')
      .update(input as never)
      .eq('id', contactId)

    if (error) {
      console.error('Error updating school contact:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateSchoolContact:', err)
    return { success: false, error: 'Failed to update contact' }
  }
}

/** Delete a school contact */
export async function deleteSchoolContact(
  contactId: string,
  schoolId: string
): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.SCHOOLS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('school_contacts')
      .delete()
      .eq('id', contactId)

    if (error) {
      console.error('Error deleting school contact:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteSchoolContact:', err)
    return { success: false, error: 'Failed to delete contact' }
  }
}
