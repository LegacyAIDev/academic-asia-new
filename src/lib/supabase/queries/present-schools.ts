import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { PresentSchoolOption, PresentSchoolSource } from '@/lib/students/present-school-name'

export type { PresentSchoolOption }

const PAGE = 1000

/** A row of the Current Schools page. */
export type PresentSchoolListRow = PresentSchoolOption & { source: PresentSchoolSource; student_count: number }

/**
 * Every row of a read that can pass the 1,000 rows the API returns per request,
 * or null when a page fails, so callers never show a list cut off part-way.
 */
async function readInPages<T>(
  read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[] | null> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await read(from, from + PAGE - 1)
    if (error) {
      console.error('Error fetching present schools:', error)
      return null
    }
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) return rows
  }
}

/** The active present schools for the student form's picker, by name. Empty on error: the picker then only offers to add a school. */
export async function getPresentSchools(): Promise<PresentSchoolOption[]> {
  const supabase = createClient(await cookies())
  const rows = await readInPages((from, to) =>
    supabase.from('present_schools').select('id, name, aliases').eq('is_active', true).order('name').order('id').range(from, to))
  return rows ?? []
}

/**
 * Every present school with the number of students attending it, by name, for
 * the Current Schools page. Throws when a page fails: an empty list there would
 * look like a list with no schools and invite staff to add them all again.
 */
export async function getPresentSchoolsWithCounts(): Promise<PresentSchoolListRow[]> {
  const supabase = createClient(await cookies())
  const rows = await readInPages((from, to) =>
    supabase.from('present_schools').select('id, name, aliases, source, students(count)').order('name').order('id').range(from, to))
  if (!rows) throw new Error('Could not load the list of current schools')

  return rows.map(({ students, source, ...school }) => ({
    ...school,
    source: source as PresentSchoolSource,
    student_count: students[0]?.count ?? 0,
  }))
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
