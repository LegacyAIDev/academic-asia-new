import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import { buildExportWorkbook } from '../build-export-workbook'
import type { BriefIntroExportPayload, BriefIntroExportRow } from '../export-types'

/**
 * Round-trips the generated file back through ExcelJS rather than asserting on
 * the builder's internals — what matters is what a recipient opens, not how it
 * was assembled.
 */

const row = (overrides: Partial<BriefIntroExportRow> = {}): BriefIntroExportRow => ({
  studentId: '11111111-1111-4111-8111-111111111111',
  studentName: 'Chan, Charlotte',
  studentCode: 'S123',
  spokenEnglish: 'Fluent',
  subjects: 'Mathematics, Art',
  hobbies: 'Piano, swimming',
  remarksHtml: '<p>A strong candidate.</p>',
  remarksText: 'A strong candidate.',
  isApproved: true,
  approvedBy: 'Amy Wong',
  approvedOn: '2026-08-20T09:00:00.000Z',
  consultant: 'Amy Wong',
  sentCount: 2,
  lastSentOn: '2026-08-21T09:00:00.000Z',
  updatedOn: '2026-08-22T09:00:00.000Z',
  ...overrides,
})

const payload = (rows: BriefIntroExportRow[]): BriefIntroExportPayload => ({
  rows,
  skipped: [],
  preparedBy: 'Amy Wong',
  generatedOn: '2026-08-27T09:30:00.000Z',
})

async function reopen(bytes: Uint8Array) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(bytes as unknown as ArrayBuffer)
  const sheet = workbook.getWorksheet('Brief Introductions')
  if (!sheet) throw new Error('The expected worksheet is missing')
  return sheet
}

describe('buildExportWorkbook', () => {
  it('produces a readable xlsx file', async () => {
    const bytes = await buildExportWorkbook(payload([row()]))

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)
    // xlsx is a zip; "PK" is the local file header signature.
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK')
  })

  it('writes one row per student, plus the header', async () => {
    const sheet = await reopen(
      await buildExportWorkbook(
        payload([row(), row({ studentId: 'b', studentName: 'Wong, Amy' })])
      )
    )
    expect(sheet.rowCount).toBe(3)
  })

  it('labels every column', async () => {
    const sheet = await reopen(await buildExportWorkbook(payload([row()])))
    const headers = (sheet.getRow(1).values as unknown[]).slice(1)

    expect(headers).toEqual([
      'Student',
      'Student code',
      'Spoken English',
      'Intended subjects',
      'Hobbies & interests',
      'Remarks',
      'Approved',
      'Approved by',
      'Approved on',
      'Consultant',
      'Times sent',
      'Last sent',
      'Last updated',
    ])
  })

  /**
   * The claim under test is twofold: formula-shaped text stays inert AND
   * survives byte-for-byte. Asserting only `formula === undefined` would pass
   * against any implementation, because ExcelJS never builds a formula cell
   * from a string — it is the exact value that pins the behaviour.
   */
  it.each([
    { label: 'hobbies', column: 5, value: '=1+1' },
    { label: 'remarks', column: 6, value: '=HYPERLINK("http://evil.example","click")' },
    { label: 'subjects', column: 4, value: '@SUM(A1)' },
  ])('keeps $label inert and unmangled', async ({ column, value }) => {
    const field = column === 5 ? 'hobbies' : column === 6 ? 'remarksText' : 'subjects'
    const sheet = await reopen(
      await buildExportWorkbook(payload([row({ [field]: value })]))
    )
    const cell = sheet.getRow(2).getCell(column)

    // Inert: a String cell, never a formula cell.
    expect(cell.type).toBe(ExcelJS.ValueType.String)
    expect(cell.formula).toBeUndefined()
    // Unmangled: exactly what was written, with no apostrophe prefix.
    expect(cell.value).toBe(value)
  })

  it('preserves a dashed list in hobbies without prefixing it', async () => {
    const sheet = await reopen(
      await buildExportWorkbook(payload([row({ hobbies: '- piano\n- swimming' })]))
    )
    expect(sheet.getRow(2).getCell(5).value).toBe('- piano\n- swimming')
  })

  it('writes dates as dates so the column sorts correctly', async () => {
    const sheet = await reopen(await buildExportWorkbook(payload([row()])))
    const approvedOn = sheet.getRow(2).getCell(9)

    expect(approvedOn.value).toBeInstanceOf(Date)
    expect((approvedOn.value as Date).toISOString()).toBe('2026-08-20T09:00:00.000Z')
  })

  it('leaves a missing date empty rather than printing Invalid Date', async () => {
    const sheet = await reopen(
      await buildExportWorkbook(payload([row({ approvedOn: null, lastSentOn: null })]))
    )

    expect(sheet.getRow(2).getCell(9).value ?? null).toBeNull()
    expect(sheet.getRow(2).getCell(12).value ?? null).toBeNull()
  })

  it('freezes the header row and applies a filter', async () => {
    const sheet = await reopen(await buildExportWorkbook(payload([row()])))

    expect(sheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 })
    expect(sheet.autoFilter).toBeTruthy()
  })

  it('renders approval as a plain yes or no', async () => {
    const sheet = await reopen(
      await buildExportWorkbook(payload([row({ isApproved: false })]))
    )
    expect(sheet.getRow(2).getCell(7).value).toBe('No')
  })
})
