/**
 * Render contract for the "Selected School List" comparison export.
 *
 * The document component should print what it is given. Every decision that
 * could make the sheet lie — which two years a column header claims, which grade
 * regime the bands belong to, which financial year the fee is from — is resolved
 * here and in export-shaping.ts, not in JSX.
 */

/** GCSE moved from lettered grades to numeric in 2022. The two are not comparable. */
export type GradeRegime = 'numeric' | 'lettered'

/**
 * Why a figure is missing. The legacy report rendered both as blank space, which
 * destroyed a real distinction: a school that withheld its figures is not the
 * same as a school that does not run the qualification.
 */
export type FigureState =
  /** Published. `value` is set. */
  | 'ok'
  /** Runs the qualification but published nothing for this year. Prints "NP". */
  | 'np'
  /** Does not run this qualification at all. Prints an em dash. */
  | 'na'

export interface Figure {
  value: number | null
  state: FigureState
}

/** One threshold row, e.g. "9-7" or "A*-B". `to` is null for a single grade. */
export interface GradeBand {
  key: string
  label: string
  from: string
  to: string | null
}

/**
 * Column definition shared by every school in the export. Resolved once per exam
 * type across the whole selection so a column header can never describe one
 * school's 2019 data as another's 2024.
 */
export interface ExamColumns {
  priorYear: number | null
  currentYear: number | null
  bands: GradeBand[]
  regime?: GradeRegime
  /**
   * True when the prior year exists but belongs to a different grade regime, so
   * it was dropped rather than printed under a header describing the other one.
   * The document explains the gap instead of showing a blank column.
   */
  priorYearSuppressed: boolean
}

/** A figure per band, keyed by GradeBand.key, for the two column years. */
export type BandFigures = Record<string, { prior: Figure; current: Figure }>

export interface FeeBand {
  yearLevelFrom: string | null
  yearLevelTo: string | null
  amount: number
}

export interface SchoolFees {
  financialYear: string
  bands: FeeBand[]
  /** Short note attached to the fee, e.g. "Fee inclusive of VAT". */
  remark: string | null
}

export interface AgeRange {
  min: number
  max: number | null
}

export interface SchoolExportRow {
  id: string
  name: string
  city: string | null
  county: string | null
  country: string | null
  website: string | null
  genderType: string | null
  religion: string | null
  pupilCount: number | null
  boarderCount: number | null
  /** Null when pupilCount is missing or zero — never divide to get a fake 0%. */
  boardingPercent: number | null
  boarderAge: AgeRange | null
  schoolAge: AgeRange | null
  fees: SchoolFees | null
  /**
   * Short note about the fee, taken from the fee record.
   *
   * Deliberately NOT schools.remarks: that column is an append-only internal
   * staff log holding commercial notes, staff names and contact routing. It is
   * not fit to appear on a document handed to a family.
   */
  remark: string | null
  /** Short-lived signed URL, or null. Only ~15% of schools have a factsheet. */
  factsheetUrl: string | null
  gcse: BandFigures
  aLevel: BandFigures
  ib: { prior: Figure; current: Figure }
}

export interface ExportMeta {
  studentName: string | null
  adviserName: string | null
  adviserTelephone: string | null
  adviserFax: string | null
  generatedOn: string
}

export interface SchoolExportPayload {
  schools: SchoolExportRow[]
  gcse: ExamColumns
  aLevel: ExamColumns
  ib: ExamColumns
  meta: ExportMeta
}

/** Raw shapes read from Supabase, before shaping. */
export interface RawAcademicResult {
  school_id: string
  exam_year: number | null
  exam_type_id: number | null
  grade_from: string | null
  grade_to: string | null
  result_percentage: number | null
}

export interface RawFee {
  school_id: string
  financial_year: string | null
  fee_type_id: number | null
  amount: number | null
  year_level_from: string | null
  year_level_to: string | null
  remarks: string | null
}
