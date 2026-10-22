'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import {
  PRESENT_SCHOOL_NAME_MAX,
  cleanOtherSpellings,
  cleanSchoolName,
  isUsableSchoolName,
  schoolSearchKeys,
} from '@/lib/students/present-school-name'
import type { ActionResult } from '@/lib/supabase/actions/students'

/*
 * Adding and renaming present schools (the schools students attend now). Anyone
 * who may edit students may do both: the same right as saving the student a
 * school is for. Only match_key is unique in the table, but a school is also
 * known by its other spellings, so every check below compares all spellings'
 * keys. Schools added here are marked source 'staff' so they can be reviewed.
 */

const MAX_OTHER_SPELLINGS = 20

type Supabase = ReturnType<typeof createClient>
type PreparedSchool = { name: string; aliases: string[]; keys: string[] }
export type PresentSchoolInput = { name: string; aliases: string[] }

/** Name and spellings cleaned the way the list writes them, or why they cannot be saved. */
function prepareSchool(name: unknown, aliases: unknown): PreparedSchool | { error: string } {
  const cleaned = cleanSchoolName(typeof name === 'string' ? name : '')
  const spellings = cleanOtherSpellings(cleaned, Array.isArray(aliases) ? aliases.filter((a): a is string => typeof a === 'string') : [])
  if (!isUsableSchoolName(cleaned)) return { error: 'Enter the name of the school' }
  if ([cleaned, ...spellings].some((n) => n.length > PRESENT_SCHOOL_NAME_MAX)) {
    return { error: `School names can be at most ${PRESENT_SCHOOL_NAME_MAX} characters` }
  }
  if (spellings.length > MAX_OTHER_SPELLINGS) return { error: `A school can have at most ${MAX_OTHER_SPELLINGS} other spellings` }
  return { name: cleaned, aliases: spellings, keys: schoolSearchKeys(cleaned, spellings) }
}

/** A school other than `exceptId` that already answers to one of these keys. */
function schoolWithAnyKey(supabase: Supabase, keys: string[], exceptId?: number) {
  const query = supabase.from('present_schools').select('id, name').overlaps('search_keys', keys)
  return (exceptId === undefined ? query : query.neq('id', exceptId)).limit(1).maybeSingle()
}

async function insertStaffSchool(supabase: Supabase, school: PreparedSchool) {
  const { data: { user } } = await supabase.auth.getUser()
  return supabase
    .from('present_schools')
    .insert({
      name: school.name,
      aliases: school.aliases,
      match_key: school.keys[0],
      search_keys: school.keys,
      source: 'staff',
      created_by: user?.id ?? null,
    })
    .select('id, name')
    .single()
}

const UNIQUE_VIOLATION = '23505'
const alreadyListed = (name?: string): ActionResult<never> =>
  ({ success: false, error: name ? `Already on the list as ${name}` : 'This school is already on the list' })

function revalidateSchoolPages() {
  revalidatePath('/students')
  revalidatePath('/students/present-schools')
}

/**
 * Add a missing school from the student form's picker. When the school is
 * already there under any spelling, that school is returned instead
 * (`created: false`) so the picker simply selects it.
 */
export async function addPresentSchool(
  name: string
): Promise<ActionResult<{ id: number; name: string; created: boolean }>> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  const school = prepareSchool(name, [])
  if ('error' in school) return { success: false, error: school.error }

  try {
    const supabase = createClient(await cookies())
    const { data: existing, error: findError } = await schoolWithAnyKey(supabase, school.keys)
    if (findError) return { success: false, error: findError.message }
    if (existing) return { success: true, data: { ...existing, created: false } }

    const { data, error } = await insertStaffSchool(supabase, school)
    if (error) {
      // A colleague added the same school a moment ago: use theirs.
      if (error.code === UNIQUE_VIOLATION) {
        const { data: raced } = await schoolWithAnyKey(supabase, school.keys)
        if (raced) return { success: true, data: { ...raced, created: false } }
      }
      console.error('Error adding present school:', error)
      return { success: false, error: error.message }
    }

    revalidateSchoolPages()
    return { success: true, data: { ...data, created: true } }
  } catch (err) {
    console.error('Error in addPresentSchool:', err)
    return { success: false, error: 'Failed to add the school' }
  }
}

/** Add a school from the Current Schools page, where a duplicate is an error to show, not a school to select. */
export async function createPresentSchool(input: PresentSchoolInput): Promise<ActionResult<{ id: number }>> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  const school = prepareSchool(input?.name, input?.aliases)
  if ('error' in school) return { success: false, error: school.error }

  try {
    const supabase = createClient(await cookies())
    const { data: existing, error: findError } = await schoolWithAnyKey(supabase, school.keys)
    if (findError) return { success: false, error: findError.message }
    if (existing) return alreadyListed(existing.name)

    const { data, error } = await insertStaffSchool(supabase, school)
    if (error) {
      if (error.code === UNIQUE_VIOLATION) return alreadyListed()
      console.error('Error creating present school:', error)
      return { success: false, error: error.message }
    }

    revalidateSchoolPages()
    return { success: true, data: { id: data.id } }
  } catch (err) {
    console.error('Error in createPresentSchool:', err)
    return { success: false, error: 'Failed to add the school' }
  }
}

/**
 * Rename a school or change its other spellings. The new name replaces the old
 * one, which is not kept as a spelling. Students linked to the school carry a
 * copy of its name (the student list, search and exports read it), so that copy
 * follows; only rows that differ are written, so saving again repairs a sync
 * that failed part-way.
 */
export async function updatePresentSchool(id: number, input: PresentSchoolInput): Promise<ActionResult> {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  if (!Number.isInteger(id)) return { success: false, error: 'School not found' }
  const school = prepareSchool(input?.name, input?.aliases)
  if ('error' in school) return { success: false, error: school.error }

  try {
    const supabase = createClient(await cookies())
    const { data: clash, error: findError } = await schoolWithAnyKey(supabase, school.keys, id)
    if (findError) return { success: false, error: findError.message }
    if (clash) return alreadyListed(clash.name)

    const { data, error } = await supabase
      .from('present_schools')
      .update({ name: school.name, aliases: school.aliases, match_key: school.keys[0], search_keys: school.keys })
      .eq('id', id)
      .select('id')
      .maybeSingle()
    if (error) {
      if (error.code === UNIQUE_VIOLATION) return alreadyListed()
      console.error('Error updating present school:', error)
      return { success: false, error: error.message }
    }
    if (!data) return { success: false, error: 'School not found' }

    const { error: syncError } = await supabase
      .from('students')
      .update({ present_school: school.name })
      .eq('present_school_id', id)
      .neq('present_school', school.name)
    // The school itself is saved either way, so its pages show the change even if some students lag behind.
    revalidateSchoolPages()
    if (syncError) {
      console.error('Error renaming present school on students:', syncError)
      return { success: false, error: 'School saved, but some of its students still show the old name. Save it again to update them.' }
    }
    return { success: true }
  } catch (err) {
    console.error('Error in updatePresentSchool:', err)
    return { success: false, error: 'Failed to update the school' }
  }
}
