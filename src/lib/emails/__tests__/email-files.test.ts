import { describe, it, expect } from 'vitest'
import {
  MAX_EMAIL_BYTES, attachmentPath, bytesMatchSource, emailFileProblem, emailSourceForFile, originalPath, ownStagingPath, stagingPath,
} from '../email-files'
import { OLE_HEADER, PDF_BYTES, sampleBytes } from './fixtures'

const ME = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const UPLOAD = '33333333-3333-4333-8333-333333333333'

describe('emailSourceForFile', () => {
  it('goes by extension, in any case, because browsers report email files without a useful type', () => {
    expect(emailSourceForFile('Offer letter.EML')).toBe('eml')
    expect(emailSourceForFile('Re: visit.msg')).toBe('msg')
    expect(emailSourceForFile('printed.pdf')).toBe('pdf')
    expect(emailSourceForFile('notes.docx')).toBeNull()
    expect(emailSourceForFile('eml')).toBeNull()
  })
})

describe('emailFileProblem', () => {
  it('refuses other types, empty files and anything over 25 MB', () => {
    expect(emailFileProblem({ name: 'a.eml', size: 10 })).toBeNull()
    expect(emailFileProblem({ name: 'a.exe', size: 10 })).toMatch(/Only .eml, .msg and PDF/)
    expect(emailFileProblem({ name: 'a.msg', size: 0 })).toMatch(/empty/)
    expect(emailFileProblem({ name: 'a.pdf', size: MAX_EMAIL_BYTES })).toBeNull()
    expect(emailFileProblem({ name: 'a.pdf', size: MAX_EMAIL_BYTES + 1 })).toMatch(/25 MB/)
  })
})

describe('bytesMatchSource', () => {
  it('accepts real files of each kind', () => {
    expect(bytesMatchSource(sampleBytes(), 'eml')).toBe(true)
    expect(bytesMatchSource(OLE_HEADER, 'msg')).toBe(true)
    expect(bytesMatchSource(PDF_BYTES, 'pdf')).toBe(true)
  })

  it('refuses a file renamed to look like another kind', () => {
    const html = new TextEncoder().encode('<html><body>Not an email</body></html>')
    expect(bytesMatchSource(html, 'eml')).toBe(false)
    expect(bytesMatchSource(PDF_BYTES, 'msg')).toBe(false)
    expect(bytesMatchSource(OLE_HEADER, 'pdf')).toBe(false)
    expect(bytesMatchSource(sampleBytes(), 'pdf')).toBe(false)
  })
})

describe('staging paths', () => {
  it('puts each upload in the uploader\'s own folder with a storage-safe name', () => {
    expect(stagingPath(ME, UPLOAD, 'Re: offer (final).msg')).toBe(`incoming/${ME}/${UPLOAD}/Re__offer__final_.msg`)
  })

  it('only lets the uploader file their own staged path', () => {
    const path = stagingPath(ME, UPLOAD, 'mail.eml')
    expect(ownStagingPath(path, ME)).toEqual({ fileName: 'mail.eml' })
    expect(ownStagingPath(path, OTHER)).toBeNull()
  })

  it('refuses anything outside the staging area or with path tricks', () => {
    for (const bad of [
      `emails/${UPLOAD}/original_mail.eml`,
      `incoming/${ME}/${UPLOAD}/../../emails/x/original_a.eml`,
      `incoming/${ME}/${UPLOAD}/sub/dir.eml`,
      `incoming/${ME}/not-a-uuid/mail.eml`,
      42,
      null,
    ]) expect(ownStagingPath(bad, ME)).toBeNull()
  })

  it('never produces a hidden or empty file name', () => {
    expect(originalPath(UPLOAD, '...eml')).toBe(`emails/${UPLOAD}/original_eml`)
    expect(attachmentPath(UPLOAD, 2, '你好.pdf')).toBe(`emails/${UPLOAD}/attachments/2___.pdf`)
    expect(attachmentPath(UPLOAD, 0, '')).toBe(`emails/${UPLOAD}/attachments/0_file`)
  })
})
