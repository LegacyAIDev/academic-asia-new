'use server'

import { revalidatePath } from 'next/cache'
import type { TablesInsert } from '@/types/database'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { checkRows, readCsv, resultKey, type ExamTypeRef, type ImportProblem, type ImportRow, type SchoolRef } from '@/lib/schools/results-import'

type ActionResult<T = void> = { success: boolean; data?: T; error?: string }

/** What an upload would do, shown before anything is saved. */
export type ImportPreview = {
  rows: number
  toAdd: number
  toUpdate: number
  schools: number
  problems: ImportProblem[]
}

/** The largest file accepted: far more than 5,000 rows of results need. */
const MAX_BYTES = 2 * 1024 * 1024
const CHUNK = 200

type Supabase = ReturnType<typeof createClient>

/** Reads and checks the file against the schools and exam types in the database. */
async function prepare(supabase: Supabase, csv: string): Promise<{ error: string } | { valid: ImportRow[]; problems: ImportProblem[]; existing: Map<string, string[]> }> {
  if (typeof csv !== 'string' || csv.length === 0) return { error: 'The file is empty.' }
  if (csv.length > MAX_BYTES) return { error: 'The file is larger than 2 MB. Split it into smaller files.' }
  const { rows, missing, problem } = readCsv(csv)
  if (problem) return { error: problem }
  if (missing.length > 0) return { error: `The file is missing these columns: ${missing.join(', ')}. Download the sample CSV to see them all.` }
  if (rows.length === 0) return { error: 'The file has no rows of results.' }

  const [schoolsRes, typesRes] = await Promise.all([
    supabase.from('schools').select('id, name'),
    supabase.from('academic_exam_types').select('id, code, label'),
  ])
  if (schoolsRes.error || typesRes.error) return { error: 'Could not load the schools to match against. Please try again.' }
  const { valid, problems } = checkRows(rows, (schoolsRes.data ?? []) as SchoolRef[], (typesRes.data ?? []) as ExamTypeRef[])

  // The results already stored for these schools, to tell updates from additions.
  const existing = new Map<string, string[]>()
  const schoolIds = [...new Set(valid.map(row => row.school_id))]
  for (let i = 0; i < schoolIds.length; i += CHUNK) {
    const { data, error } = await supabase
      .from('school_academic_results')
      .select('id, school_id, exam_year, exam_type_id, grade_from, grade_to')
      .in('school_id', schoolIds.slice(i, i + CHUNK))
    if (error) return { error: 'Could not read the existing results. Please try again.' }
    for (const row of (data ?? []) as { id: string; school_id: string; exam_year: number | null; exam_type_id: number | null; grade_from: string | null; grade_to: string | null }[]) {
      const key = resultKey(row)
      existing.set(key, [...(existing.get(key) ?? []), row.id])
    }
  }
  return { valid, problems, existing }
}

/** Checks an upload and says what importing it would do. Nothing is saved. */
export async function previewResultsImport(csv: string): Promise<ActionResult<ImportPreview>> {
  const denied = await assertAccess(MODULES.SCHOOLS, ACCESS.WRITE)
  if (denied) return denied
  try {
    const prepared = await prepare(createClient(await cookies()), csv)
    if ('error' in prepared) return { success: false, error: prepared.error }
    const { valid, problems, existing } = prepared
    const toUpdate = valid.filter(row => existing.has(resultKey(row))).length
    return {
      success: true,
      data: { rows: valid.length + problems.length, toAdd: valid.length - toUpdate, toUpdate, schools: new Set(valid.map(r => r.school_id)).size, problems },
    }
  } catch (err) {
    console.error('Error in previewResultsImport:', err)
    return { success: false, error: 'Could not read the file. Please try again.' }
  }
}

/**
 * Imports an upload. Rows with problems are skipped (the preview lists them);
 * a row matching a stored result (same school, year, exam type and grades)
 * updates its percentage and remarks, every other row is added.
 */
export async function applyResultsImport(csv: string): Promise<ActionResult<{ added: number; updated: number; skipped: number }>> {
  const denied = await assertAccess(MODULES.SCHOOLS, ACCESS.WRITE)
  if (denied) return denied
  try {
    const supabase = createClient(await cookies())
    const prepared = await prepare(supabase, csv)
    if ('error' in prepared) return { success: false, error: prepared.error }
    const { valid, problems, existing } = prepared

    const toInsert: TablesInsert<'school_academic_results'>[] = []
    let updated = 0
    for (const row of valid) {
      const fields = { result_percentage: row.result_percentage, remarks: row.remarks }
      const ids = existing.get(resultKey(row))
      if (!ids) {
        toInsert.push({
          school_id: row.school_id, exam_year: row.exam_year, exam_type_id: row.exam_type_id,
          grade_from: row.grade_from, grade_to: row.grade_to, ...fields,
        })
        continue
      }
      // Older data can hold the same result twice; both copies take the new figure.
      const { error } = await supabase.from('school_academic_results').update(fields).in('id', ids)
      if (error) return { success: false, error: `Stopped at line ${row.line}: ${error.message}. Rows before it were saved.` }
      updated++
    }
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const { error } = await supabase.from('school_academic_results').insert(toInsert.slice(i, i + CHUNK))
      if (error) return { success: false, error: `Could not add the new results: ${error.message}. ${updated} updated results were saved.` }
    }

    for (const schoolId of new Set(valid.map(row => row.school_id))) revalidatePath(`/schools/${schoolId}`)
    return { success: true, data: { added: toInsert.length, updated, skipped: problems.length } }
  } catch (err) {
    console.error('Error in applyResultsImport:', err)
    return { success: false, error: 'The import failed. Please try again.' }
  }
}
