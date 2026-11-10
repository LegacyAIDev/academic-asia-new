import { describe, expect, it } from 'vitest'
import { ALLOWED_MIME, MAX_BYTES, formatFileSize, isSafeExternalUrl, urlHostname, checkUploadable } from '../constraints'

describe('upload constraints', () => {
  // These were moved here from student-documents.ts / school-documents.ts. The
  // assertions guard the move: changing them silently changes what every upload
  // path in the app accepts.
  it('accepts exactly the four historical mime types', () => {
    expect(ALLOWED_MIME).toEqual(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
  })

  it('caps uploads at 10 MB, matching the storage bucket limit', () => {
    expect(MAX_BYTES).toBe(10 * 1024 * 1024)
  })
})

describe('isSafeExternalUrl', () => {
  it.each([
    'https://example.com/paper.pdf',
    'http://example.com',
    'https://sub.example.co.uk/a/b?c=d#e',
  ])('accepts %s', url => {
    expect(isSafeExternalUrl(url)).toBe(true)
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    '//evil.com',
    'example.com',
    '',
    '   ',
    'not a url',
  ])('rejects %s', url => {
    expect(isSafeExternalUrl(url)).toBe(false)
  })

  it('tolerates surrounding whitespace on an otherwise valid link', () => {
    expect(isSafeExternalUrl('  https://example.com  ')).toBe(true)
  })
})

describe('urlHostname', () => {
  it('strips the www prefix', () => {
    expect(urlHostname('https://www.example.com/x')).toBe('example.com')
  })

  it('falls back to the raw value when parsing fails', () => {
    expect(urlHostname('nonsense')).toBe('nonsense')
  })
})

describe('formatFileSize', () => {
  it('renders bytes, kilobytes and megabytes', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(2048)).toBe('2.0 KB')
    expect(formatFileSize(5 * 1048576)).toBe('5.0 MB')
  })

  it('renders nothing for a missing size', () => {
    expect(formatFileSize(null)).toBe('')
  })
})

describe('checkUploadable (DEV24-012)', () => {
  it('refuses unsupported types and oversized files, naming each, and keeps the rest', () => {
    const files = [
      { name: 'report.pdf', type: 'application/pdf', size: 2000 },
      { name: 'notes.txt', type: 'text/plain', size: 56 },
      { name: 'scan.gif', type: 'image/gif', size: 900 },
      { name: 'huge.png', type: 'image/png', size: 11 * 1024 * 1024 },
    ]
    const { ok, refused } = checkUploadable(files)
    expect(ok.map(f => f.name)).toEqual(['report.pdf'])
    expect(refused).toEqual([
      "notes.txt can't be uploaded: only PDF, JPG, PNG and WebP files are accepted.",
      "scan.gif can't be uploaded: only PDF, JPG, PNG and WebP files are accepted.",
      'huge.png is larger than 10 MB, the upload limit.',
    ])
  })
})

