/**
 * The results CSV's columns and sample, kept apart from the parser in
 * results-import.ts so the import sheet can offer the sample without shipping
 * papaparse to the browser.
 */

export const IMPORT_COLUMNS = ['school', 'school_id', 'exam_year', 'exam_type', 'grade_from', 'grade_to', 'result_percent', 'remarks'] as const

/** The sample offered for download: every column, and rows showing GCSE, A-level and IB. */
export const SAMPLE_CSV = [
  IMPORT_COLUMNS.join(','),
  'Brighton College,,2025,GCSE,9,7,81.5,Published August 2025',
  'Brighton College,,2025,GCSE,9,4,98.2,',
  'Brighton College,,2025,A Level,A*,A,62.4,',
  'Brighton College,,2025,A Level,A*,,24.1,A* only: leave grade_to empty',
  'Sevenoaks School,,2025,IB,,,38.6,IB average diploma points: leave both grades empty',
].join('\n') + '\n'
