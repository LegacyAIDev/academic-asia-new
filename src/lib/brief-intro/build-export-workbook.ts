import 'server-only'
import ExcelJS from 'exceljs'
import { toCellDate, toCellText } from './export-shaping'
import type { BriefIntroExportPayload, BriefIntroExportRow } from './export-types'

/**
 * Build the Brief Introduction spreadsheet: one row per student, one column per
 * field, so the sheet can be sorted and filtered like any other data table.
 *
 * Values are written verbatim. See toCellText in export-shaping.ts for why no
 * formula-injection escaping happens here — .xlsx string cells are inert, and
 * escaping them would corrupt the data it claims to protect.
 *
 * Dates are written as real Date values rather than date-shaped strings; a
 * column of text sorts lexicographically, putting 1 February ahead of 2 January.
 */

interface ColumnSpec {
  header: string
  width: number
  /** Long free text; without this the cell is one unreadable line. */
  wrap?: boolean
  /** Marked explicitly rather than inferred from the header, so renaming a
   *  column cannot silently turn its dates back into text. */
  isDate?: boolean
  value: (row: BriefIntroExportRow) => string | number | Date | null
}

const COLUMNS: ColumnSpec[] = [
  { header: 'Student', width: 26, value: (r) => toCellText(r.studentName) },
  { header: 'Student code', width: 14, value: (r) => toCellText(r.studentCode) },
  { header: 'Spoken English', width: 16, value: (r) => toCellText(r.spokenEnglish) },
  { header: 'Intended subjects', width: 30, wrap: true, value: (r) => toCellText(r.subjects) },
  { header: 'Hobbies & interests', width: 40, wrap: true, value: (r) => toCellText(r.hobbies) },
  { header: 'Remarks', width: 50, wrap: true, value: (r) => toCellText(r.remarksText) },
  { header: 'Approved', width: 10, value: (r) => (r.isApproved ? 'Yes' : 'No') },
  { header: 'Approved by', width: 20, value: (r) => toCellText(r.approvedBy) },
  { header: 'Approved on', width: 14, isDate: true, value: (r) => toCellDate(r.approvedOn) },
  { header: 'Consultant', width: 20, value: (r) => toCellText(r.consultant) },
  { header: 'Times sent', width: 11, value: (r) => r.sentCount },
  { header: 'Last sent', width: 14, isDate: true, value: (r) => toCellDate(r.lastSentOn) },
  { header: 'Last updated', width: 14, isDate: true, value: (r) => toCellDate(r.updatedOn) },
]

const DATE_FORMAT = 'dd mmm yyyy'

export async function buildExportWorkbook(
  payload: BriefIntroExportPayload
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Academic Asia'
  workbook.created = new Date(payload.generatedOn)

  const sheet = workbook.addWorksheet('Brief Introductions', {
    // Freezing the header keeps the column meanings visible while scrolling a
    // long selection — the whole point of a flat sheet over a document.
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  sheet.columns = COLUMNS.map((column) => ({
    header: column.header,
    key: column.header,
    width: column.width,
  }))

  for (const row of payload.rows) {
    sheet.addRow(COLUMNS.map((column) => column.value(row)))
  }

  // Column-level styling is applied after the rows: in ExcelJS a column style
  // set beforehand is not inherited by rows added later.
  COLUMNS.forEach((column, index) => {
    const sheetColumn = sheet.getColumn(index + 1)
    sheetColumn.alignment = { vertical: 'top', wrapText: column.wrap === true }
    if (column.isDate) sheetColumn.numFmt = DATE_FORMAT
  })

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.alignment = { vertical: 'middle' }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF1F3' } }

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: COLUMNS.length },
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Uint8Array(buffer)
}
