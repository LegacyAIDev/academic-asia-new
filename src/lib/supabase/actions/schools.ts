'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { normaliseCounty } from '@/lib/schools/county'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { purgeOwnerStorage } from '@/lib/supabase/actions/record-attachments'

export type CreateSchoolInput = {
  name: string
  address?: string | null
  city?: string | null
  county?: string | null
  postcode?: string | null
  country_id?: number | null
  latitude?: number | null
  longitude?: number | null
  telephone?: string | null
  fax?: string | null
  email?: string | null
  website?: string | null
  gender_type_id?: number | null
  institution_type_id?: number | null
  phase_id?: number | null
  religious_affiliation_id?: number | null
  coed_from_id?: number | null
  pupil_count?: number | null
  boarder_count?: number | null
  boarder_age_min?: number | null
  boarder_age_max?: number | null
  school_age_min?: number | null
  school_age_max?: number | null
  offers_a_level?: boolean | null
  offers_ib?: boolean | null
  child_visa_age?: number | null
  accepts_child_visa?: boolean | null
  accepts_general_visa?: boolean | null
  status?: string | null
  accepts_applications?: boolean | null
  keywords?: string | null
  remarks?: string | null
}

export type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Create a new school
 */
/**
 * Keep county_normalised in step with whatever county was typed, so a school
 * saved today appears in the list filter without waiting for someone to rerun
 * scripts/40_normalise-school-county.ts.
 *
 * Only applied when `county` is part of the write — a partial update that does
 * not touch county must not clear the normalised value.
 */
function withNormalisedCounty<T extends Partial<CreateSchoolInput>>(input: T) {
  if (!('county' in input)) return input
  return { ...input, county_normalised: normaliseCounty(input.county ?? null) }
}

export async function createSchool(input: CreateSchoolInput): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.SCHOOLS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('schools')
      .insert(withNormalisedCounty(input) as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating school:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/schools')
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createSchool:', err)
    return { success: false, error: 'Failed to create school' }
  }
}

/**
 * Update an existing school by ID
 */
export async function updateSchool(id: string, input: Partial<CreateSchoolInput>): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.SCHOOLS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('schools')
      .update(withNormalisedCounty(input) as never)
      .eq('id', id)

    if (error) {
      console.error('Error updating school:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/schools')
    revalidatePath(`/schools/${id}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateSchool:', err)
    return { success: false, error: 'Failed to update school' }
  }
}

/**
 * Delete a school
 */
export async function deleteSchool(id: string): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.SCHOOLS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Storage is outside Postgres, so the row cascade does not reach the files.
    await purgeOwnerStorage('school', id)

    const { error } = await supabase
      .from('schools')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting school:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/schools')
    return { success: true }
  } catch (err) {
    console.error('Error in deleteSchool:', err)
    return { success: false, error: 'Failed to delete school' }
  }
}

// ============================================
// School Supplementary Info Actions
// ============================================

export type CreateSupInfoInput = {
  school_id: string
  category_id: number
  info?: string | null
  school_year?: string | null
  remarks?: string | null
  assigned_to?: string | null
}

/**
 * Create new supplementary info for a school
 */
export async function createSchoolSupInfo(input: CreateSupInfoInput): Promise<ActionResult<{ id: string }>> {
  const denied = await assertAccess(MODULES.SCHOOLS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('school_supplementary_info')
      .insert(input as never)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating supplementary info:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${input.school_id}`)
    return { success: true, data: { id: (data as { id: string }).id } }
  } catch (err) {
    console.error('Error in createSchoolSupInfo:', err)
    return { success: false, error: 'Failed to create supplementary info' }
  }
}

/**
 * Update supplementary info by ID
 */
export async function updateSchoolSupInfo(
  id: string,
  schoolId: string,
  input: Partial<Omit<CreateSupInfoInput, 'school_id'>>
): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.SCHOOLS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('school_supplementary_info')
      .update(input as never)
      .eq('id', id)

    if (error) {
      console.error('Error updating supplementary info:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in updateSchoolSupInfo:', err)
    return { success: false, error: 'Failed to update supplementary info' }
  }
}

/**
 * Delete supplementary info
 */
export async function deleteSchoolSupInfo(id: string, schoolId: string): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.SCHOOLS, ACCESS.WRITE)
  if (denied) return denied

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
      .from('school_supplementary_info')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting supplementary info:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/schools/${schoolId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in deleteSchoolSupInfo:', err)
    return { success: false, error: 'Failed to delete supplementary info' }
  }
}
