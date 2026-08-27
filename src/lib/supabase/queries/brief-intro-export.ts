/**
 * Data access for the Brief Introduction export.
 *
 * Two batched reads regardless of how many students are selected — the export
 * renders synchronously behind a download button, so an N+1 across a selection
 * would be felt directly by whoever is waiting for the file.
 *
 * The two reads are separate on purpose rather than one join. Students without
 * an introduction have to be distinguishable from students with a blank one:
 * the first are reported back to the UI as skipped, the second are exported as
 * they stand. An inner join would silently drop both, and an outer join would
 * silently export both.
 *
 * All shaping lives in src/lib/brief-intro/export-shaping.ts. This file only
 * fetches rows and hands them over.
 */

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  htmlToPlainText,
  profileName,
  resolveSpokenEnglish,
  studentSortName,
} from '@/lib/brief-intro/export-shaping'
import type {
  BriefIntroExportPayload,
  BriefIntroExportRow,
} from '@/lib/brief-intro/export-types'

/**
 * Chromium renders one page per introduction inside the route's 60s budget.
 * Kept well under it so a cold start plus a slow database still finishes.
 */
export const MAX_PDF_INTROS = 100

/** No browser involved, so the only real constraint is payload size. */
export const MAX_EXCEL_INTROS = 500

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type BriefIntroExportResult =
  | { ok: true; payload: BriefIntroExportPayload }
  | { ok: false; error: string }

export interface BriefIntroExportOptions {
  preparedBy?: string | null
  /** Injected so the payload stays deterministic and testable. */
  generatedOn?: string
  limit: number
}

interface StudentRow {
  id: string
  first_name: string | null
  surname: string | null
  student_code: string | null
}

interface IntroRow {
  student_id: string
  hobbies: string | null
  subjects: string | null
  remarks: string | null
  is_approved: boolean | null
  approved_at: string | null
  legacy_spoken_english: string | null
  updated_at: string | null
  spoken_english: { label: string } | null
  assigned_profile: { first_name: string | null; surname: string | null } | null
  approved_profile: { first_name: string | null; surname: string | null } | null
  sent_history: { sent_at: string | null }[] | null
}

export async function getBriefIntroExportData(
  studentIds: string[],
  { preparedBy = null, generatedOn, limit }: BriefIntroExportOptions
): Promise<BriefIntroExportResult> {
  // Non-UUIDs would make PostgREST reject the whole request rather than
  // ignoring the bad value, so they are dropped before the query is built.
  const ids = Array.from(new Set(studentIds.filter((id) => UUID_RE.test(id))))

  if (ids.length === 0) {
    return { ok: false, error: 'Select at least one student to export.' }
  }
  if (ids.length > limit) {
    return {
      ok: false,
      error: `Select at most ${limit} students — ${ids.length} were selected.`,
    }
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [studentRes, introRes] = await Promise.all([
    supabase.from('students').select('id, first_name, surname, student_code').in('id', ids),
    supabase
      .from('student_brief_intro')
      .select(
        `
        student_id, hobbies, subjects, remarks, is_approved, approved_at,
        legacy_spoken_english, updated_at,
        spoken_english:spoken_english_levels(label),
        assigned_profile:profiles!student_brief_intro_assigned_to_fkey(first_name, surname),
        approved_profile:profiles!student_brief_intro_approved_by_fkey(first_name, surname),
        sent_history:student_intro_sent_history(sent_at)
      `
      )
      .in('student_id', ids),
  ])

  if (studentRes.error || introRes.error) {
    // Never log the rows: they carry student names.
    console.error(
      'Failed to load the brief introduction export data:',
      studentRes.error ?? introRes.error
    )
    return { ok: false, error: 'Could not load the selected students.' }
  }

  // Supabase-js bails out of deep select inference on tables this wide and
  // resolves the row type to `never`, so both results are typed explicitly.
  const students = (studentRes.data ?? []) as unknown as StudentRow[]
  const intros = (introRes.data ?? []) as unknown as IntroRow[]

  if (students.length === 0) {
    return { ok: false, error: 'None of the selected students could be found.' }
  }

  const introByStudent = new Map(intros.map((intro) => [intro.student_id, intro]))

  const rows: BriefIntroExportRow[] = []
  const skipped: BriefIntroExportPayload['skipped'] = []

  for (const student of students) {
    const studentName = studentSortName(student.first_name, student.surname)
    const intro = introByStudent.get(student.id)

    if (!intro) {
      skipped.push({ studentId: student.id, studentName })
      continue
    }

    rows.push({
      studentId: student.id,
      studentName,
      studentCode: student.student_code,
      spokenEnglish: resolveSpokenEnglish(intro.spoken_english, intro.legacy_spoken_english),
      subjects: intro.subjects?.trim() ?? '',
      hobbies: intro.hobbies?.trim() ?? '',
      remarksHtml: intro.remarks,
      remarksText: htmlToPlainText(intro.remarks),
      isApproved: intro.is_approved === true,
      approvedBy: profileName(intro.approved_profile),
      approvedOn: intro.approved_at,
      consultant: profileName(intro.assigned_profile),
      sentCount: intro.sent_history?.length ?? 0,
      lastSentOn: latestSentAt(intro.sent_history),
      updatedOn: intro.updated_at,
    })
  }

  if (rows.length === 0) {
    return {
      ok: false,
      error: 'None of the selected students have a brief introduction yet.',
    }
  }

  rows.sort((a, b) => a.studentName.localeCompare(b.studentName))
  skipped.sort((a, b) => a.studentName.localeCompare(b.studentName))

  return {
    ok: true,
    payload: {
      rows,
      skipped,
      preparedBy,
      generatedOn: generatedOn ?? new Date().toISOString(),
    },
  }
}

/**
 * Which of these students already have an introduction written.
 *
 * Used by the export picker to mark rows before anything is downloaded — being
 * told after the fact that half a selection was left out is a poor way to find
 * out. One id-only read, no joins.
 */
export async function getStudentIdsWithBriefIntro(
  studentIds: string[]
): Promise<Set<string>> {
  const ids = studentIds.filter((id) => UUID_RE.test(id))
  if (ids.length === 0) return new Set()

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('student_brief_intro')
    .select('student_id')
    .in('student_id', ids)

  if (error) {
    console.error('Failed to check which students have a brief introduction:', error)
    return new Set()
  }

  return new Set((data ?? []).map((row) => (row as { student_id: string }).student_id))
}

function latestSentAt(history: { sent_at: string | null }[] | null): string | null {
  const timestamps = (history ?? [])
    .map((entry) => entry.sent_at)
    .filter((value): value is string => Boolean(value))

  if (timestamps.length === 0) return null
  return timestamps.reduce((latest, value) => (value > latest ? value : latest))
}
