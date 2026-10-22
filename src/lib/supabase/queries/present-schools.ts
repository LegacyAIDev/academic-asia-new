import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { PresentSchoolOption } from '@/lib/students/present-school-name'

export type { PresentSchoolOption }

const PAGE = 1000

/**
 * The active present schools for the student form's picker, by name. The list
 * holds more than the 1,000 rows the API returns per request, so it is read in
 * pages. Empty on error: the picker then only offers to add a school.
 */
export async function getPresentSchools(): Promise<PresentSchoolOption[]> {
  const supabase = createClient(await cookies())
  const schools: PresentSchoolOption[] = []

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('present_schools')
      .select('id, name, aliases')
      .eq('is_active', true)
      .order('name')
      .order('id')
      .range(from, from + PAGE - 1)

    if (error) {
      console.error('Error fetching present schools:', error)
      return []
    }
    schools.push(...(data ?? []))
    if (!data || data.length < PAGE) return schools
  }
}

/**
 * The list name of one present school, or null when there is no such school.
 * Throws when the read fails, so the save that asked does not tell staff to
 * choose a school they already chose.
 */
export async function getPresentSchoolName(id: number): Promise<string | null> {
  const supabase = createClient(await cookies())
  const { data, error } = await supabase.from('present_schools').select('name').eq('id', id).maybeSingle()

  if (error) throw new Error(error.message)
  return data?.name ?? null
}
