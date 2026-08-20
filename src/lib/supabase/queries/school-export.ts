/**
 * Data access for the "Selected School List" comparison export.
 *
 * One batched read per table regardless of how many schools are selected — the
 * export is rendered synchronously for print, so an N+1 across a shortlist would
 * be felt directly.
 *
 * All shaping decisions live in src/lib/schools/export-shaping.ts. This file only
 * fetches and hands rows over.
 */

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  boardingPercent,
  resolveCurrentFee,
  resolveExamColumns,
  resolveIbColumns,
  toBandFigures,
  toIbFigures,
} from '@/lib/schools/export-shaping'
import type {
  AgeRange,
  RawAcademicResult,
  RawFee,
  SchoolExportPayload,
  SchoolExportRow,
} from '@/lib/schools/export-types'

/** Above this the sheet stops being a comparison and the payload gets unwieldy. */
export const MAX_EXPORT_SCHOOLS = 30
/** A comparison of one is not a comparison. */
export const MIN_EXPORT_SCHOOLS = 1

const FACTSHEET_CATEGORY_CODE = 'school_factsheet'
const SCHOOL_DOCUMENTS_BUCKET = 'school-documents'
const SIGNED_URL_TTL_SECONDS = 3600

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface SchoolExportOptions {
  studentName?: string | null
  adviserName?: string | null
  adviserTelephone?: string | null
  adviserFax?: string | null
  /** Injected so the payload stays deterministic and testable. */
  generatedOn?: string
}

export type SchoolExportResult =
  | { ok: true; payload: SchoolExportPayload }
  | { ok: false; error: string }

interface SchoolRecord {
  id: string
  name: string
  city: string | null
  county: string | null
  website: string | null
  pupil_count: number | null
  boarder_count: number | null
  boarder_age_min: number | null
  boarder_age_max: number | null
  school_age_min: number | null
  school_age_max: number | null
  offers_a_level: boolean | null
  offers_ib: boolean | null
  country: { label: string } | null
  gender_type: { label: string } | null
  religious_affiliation: { label: string } | null
}

const ageRange = (min: number | null, max: number | null): AgeRange | null =>
  min === null && max === null ? null : { min: min ?? 0, max }

const groupBySchool = <T extends { school_id: string }>(rows: T[]): Map<string, T[]> => {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const existing = map.get(row.school_id)
    if (existing) existing.push(row)
    else map.set(row.school_id, [row])
  }
  return map
}

export async function getSchoolExportData(
  schoolIds: string[],
  options: SchoolExportOptions = {}
): Promise<SchoolExportResult> {
  // The ids arrive from a user-controlled URL.
  const ids = [...new Set(schoolIds)].filter((id) => UUID_RE.test(id))

  if (ids.length < MIN_EXPORT_SCHOOLS) {
    return { ok: false, error: 'Select at least one school to export.' }
  }
  if (ids.length > MAX_EXPORT_SCHOOLS) {
    return { ok: false, error: `Select at most ${MAX_EXPORT_SCHOOLS} schools to export.` }
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [schoolsRes, examTypesRes, feeTypesRes, factsheetCategoryRes] = await Promise.all([
    supabase
      .from('schools')
      .select(
        `id, name, city, county, website, pupil_count, boarder_count,
         boarder_age_min, boarder_age_max, school_age_min, school_age_max,
         offers_a_level, offers_ib,
         country:countries!schools_country_id_fkey(label),
         gender_type:school_gender_types!schools_gender_type_id_fkey(label),
         religious_affiliation:school_religious_affiliations!schools_religious_affiliation_id_fkey(label)`
      )
      .in('id', ids),
    supabase.from('academic_exam_types').select('id, code').in('code', ['gcse', 'a_level', 'ib']),
    supabase.from('fee_types').select('id, code').eq('code', 'course').single(),
    supabase.from('document_categories').select('id').eq('code', FACTSHEET_CATEGORY_CODE).single(),
  ])

  if (schoolsRes.error) return { ok: false, error: schoolsRes.error.message }
  if (examTypesRes.error) return { ok: false, error: examTypesRes.error.message }

  const schools = (schoolsRes.data ?? []) as unknown as SchoolRecord[]
  if (schools.length === 0) return { ok: false, error: 'None of the selected schools were found.' }

  const examTypeIdByCode = new Map(
    ((examTypesRes.data ?? []) as { id: number; code: string }[]).map((t) => [t.code, t.id])
  )
  const courseFeeTypeId = (feeTypesRes.data as { id: number } | null)?.id ?? -1
  const factsheetCategoryId = (factsheetCategoryRes.data as { id: number } | null)?.id ?? -1

  const [resultsRes, feesRes, documentsRes] = await Promise.all([
    supabase
      .from('school_academic_results')
      .select('school_id, exam_year, exam_type_id, grade_from, grade_to, result_percentage')
      .in('school_id', ids)
      .in('exam_type_id', [...examTypeIdByCode.values()]),
    supabase
      .from('school_fees')
      .select('school_id, financial_year, fee_type_id, amount, year_level_from, year_level_to, remarks')
      .in('school_id', ids)
      .eq('fee_type_id', courseFeeTypeId),
    supabase
      .from('school_documents')
      .select('school_id, file_path, created_at')
      .in('school_id', ids)
      .eq('category_id', factsheetCategoryId)
      .order('created_at', { ascending: false }),
  ])

  if (resultsRes.error) return { ok: false, error: resultsRes.error.message }
  if (feesRes.error) return { ok: false, error: feesRes.error.message }

  const allResults = (resultsRes.data ?? []) as RawAcademicResult[]
  const feesBySchool = groupBySchool((feesRes.data ?? []) as RawFee[])

  const resultsFor = (code: 'gcse' | 'a_level' | 'ib') => {
    const typeId = examTypeIdByCode.get(code)
    return allResults.filter((r) => r.exam_type_id === typeId)
  }

  const gcseResults = resultsFor('gcse')
  const aLevelResults = resultsFor('a_level')
  const ibResults = resultsFor('ib')

  // Resolved once across the whole selection so a shared column header can never
  // describe one school's data as another's. Per exam type, because A-Level runs
  // a publication cycle ahead of GCSE.
  const gcseColumns = resolveExamColumns(gcseResults, 'gcse')
  const aLevelColumns = resolveExamColumns(aLevelResults, 'a_level')
  const ibColumns = resolveIbColumns(ibResults)

  const gcseBySchool = groupBySchool(gcseResults)
  const aLevelBySchool = groupBySchool(aLevelResults)
  const ibBySchool = groupBySchool(ibResults)

  // Only the newest factsheet per school; the bucket is private so the document
  // needs a short-lived signed URL. A failure here must not fail the export —
  // most schools have no factsheet at all.
  const latestFactsheetPath = new Map<string, string>()
  for (const doc of (documentsRes.data ?? []) as { school_id: string; file_path: string }[]) {
    if (!latestFactsheetPath.has(doc.school_id)) latestFactsheetPath.set(doc.school_id, doc.file_path)
  }

  const factsheetUrlBySchool = new Map<string, string>()
  await Promise.all(
    [...latestFactsheetPath.entries()].map(async ([schoolId, filePath]) => {
      const { data } = await supabase.storage
        .from(SCHOOL_DOCUMENTS_BUCKET)
        .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS)
      if (data?.signedUrl) factsheetUrlBySchool.set(schoolId, data.signedUrl)
    })
  )

  // Preserve the order the caller selected them in.
  const orderedSchools = ids
    .map((id) => schools.find((s) => s.id === id))
    .filter((s): s is SchoolRecord => s !== undefined)

  // Resolved once per school rather than twice per row.
  const currentFeeBySchool = new Map(
    orderedSchools.map((s) => [s.id, resolveCurrentFee(feesBySchool.get(s.id) ?? [], courseFeeTypeId)])
  )
  const currentFeeFor = (id: string) => currentFeeBySchool.get(id) ?? null

  const rows: SchoolExportRow[] = orderedSchools.map((school) => ({
    id: school.id,
    name: school.name,
    city: school.city,
    county: school.county,
    country: school.country?.label ?? null,
    website: school.website,
    genderType: school.gender_type?.label ?? null,
    religion: school.religious_affiliation?.label ?? null,
    pupilCount: school.pupil_count,
    boarderCount: school.boarder_count,
    boardingPercent: boardingPercent(school.pupil_count, school.boarder_count),
    boarderAge: ageRange(school.boarder_age_min, school.boarder_age_max),
    schoolAge: ageRange(school.school_age_min, school.school_age_max),
    fees: currentFeeFor(school.id),
    remark: currentFeeFor(school.id)?.remark ?? null,
    factsheetUrl: factsheetUrlBySchool.get(school.id) ?? null,
    gcse: toBandFigures(gcseBySchool.get(school.id) ?? [], gcseColumns, null),
    aLevel: toBandFigures(aLevelBySchool.get(school.id) ?? [], aLevelColumns, school.offers_a_level),
    ib: toIbFigures(ibBySchool.get(school.id) ?? [], ibColumns, school.offers_ib),
  }))

  return {
    ok: true,
    payload: {
      schools: rows,
      gcse: gcseColumns,
      aLevel: aLevelColumns,
      ib: ibColumns,
      meta: {
        studentName: options.studentName ?? null,
        adviserName: options.adviserName ?? null,
        adviserTelephone: options.adviserTelephone ?? null,
        adviserFax: options.adviserFax ?? null,
        generatedOn: options.generatedOn ?? new Date().toISOString(),
      },
    },
  }
}
