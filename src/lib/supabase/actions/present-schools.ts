'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { PRESENT_SCHOOL_NAME_MAX, cleanSchoolName, schoolSearchKeys } from '@/lib/students/present-school-name'
import type { ActionResult } from '@/lib/supabase/actions/students'

/**
 * Add a school that is missing from the present-schools list, from the student
 * form's picker. Anyone who may edit students may add one: the same right as
 * saving the student it is for. Marked source 'staff' so these can be reviewed.
 *
 * Only match_key is unique in the table, but a school is also known by its
 * alternative spellings, so the lookup checks every spelling's key. When the
 * school is already there under any of them, that school is returned instead
 * (`created: false`) and nothing is inserted.
 */
export async function addPresentSchool(
  name: string
): Promise<ActionResult<{ id: number; name: string; created: boolean }>> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  const cleaned = cleanSchoolName(typeof name === 'string' ? name : '')
  const keys = schoolSearchKeys(cleaned, [])
  if (keys.length === 0) return { success: false, error: 'Enter the name of the school' }
  if (cleaned.length > PRESENT_SCHOOL_NAME_MAX) {
    return { success: false, error: `School names can be at most ${PRESENT_SCHOOL_NAME_MAX} characters` }
  }

  try {
    const supabase = createClient(await cookies())
    const findExisting = () =>
      supabase.from('present_schools').select('id, name').overlaps('search_keys', keys).limit(1).maybeSingle()

    const { data: existing, error: findError } = await findExisting()
    if (findError) return { success: false, error: findError.message }
    if (existing) return { success: true, data: { ...existing, created: false } }

    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('present_schools')
      .insert({ name: cleaned, match_key: keys[0], search_keys: keys, source: 'staff', created_by: user?.id ?? null })
      .select('id, name')
      .single()

    if (error) {
      // A colleague added the same school a moment ago: use theirs.
      if (error.code === '23505') {
        const { data: raced } = await findExisting()
        if (raced) return { success: true, data: { ...raced, created: false } }
      }
      console.error('Error adding present school:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/students')
    return { success: true, data: { ...data, created: true } }
  } catch (err) {
    console.error('Error in addPresentSchool:', err)
    return { success: false, error: 'Failed to add the school' }
  }
}
