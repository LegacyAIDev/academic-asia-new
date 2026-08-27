import { describe, it, expect } from 'vitest'
import {
  exportFilename,
  formatExportDate,
  htmlToPlainText,
  profileName,
  resolveSpokenEnglish,
  studentSortName,
  toCellDate,
  toCellText,
  truncateForCell,
} from '../export-shaping'

describe('htmlToPlainText', () => {
  it('passes plain text through untouched', () => {
    expect(htmlToPlainText('Piano, swimming and debating.')).toBe(
      'Piano, swimming and debating.'
    )
  })

  it('returns an empty string for nothing', () => {
    expect(htmlToPlainText(null)).toBe('')
    expect(htmlToPlainText('')).toBe('')
  })

  it('keeps paragraphs apart instead of running them together', () => {
    expect(htmlToPlainText('<p>First point.</p><p>Second point.</p>')).toBe(
      'First point.\n\nSecond point.'
    )
  })

  it('turns a line break into a newline', () => {
    expect(htmlToPlainText('<p>Line one<br>Line two</p>')).toBe('Line one\nLine two')
  })

  it('bullets list items', () => {
    expect(htmlToPlainText('<ul><li>Piano</li><li>Swimming</li></ul>')).toBe(
      '• Piano\n• Swimming'
    )
  })

  it('decodes entities', () => {
    expect(htmlToPlainText('<p>Maths &amp; Science &quot;A&quot;&nbsp;stream</p>')).toBe(
      'Maths & Science "A" stream'
    )
  })

  it('decodes an escaped tag once, without reviving it as markup', () => {
    expect(htmlToPlainText('<p>&amp;lt;not a tag&amp;gt;</p>')).toBe('&lt;not a tag&gt;')
  })

  it('drops script content rather than spilling it into the cell', () => {
    const flattened = htmlToPlainText('<p>Safe</p><script>alert("x")</script>')
    expect(flattened).toBe('Safe')
    expect(flattened).not.toContain('alert')
  })

  it('drops style content', () => {
    expect(htmlToPlainText('<style>p{color:red}</style><p>Visible</p>')).toBe('Visible')
  })

  it('collapses runs of blank lines', () => {
    expect(htmlToPlainText('<p>A</p><p></p><p></p><p>B</p>')).toBe('A\n\nB')
  })

  it('strips attributes and nested markup without leaking tag text', () => {
    const flattened = htmlToPlainText(
      '<p class="x"><strong>Bold</strong> and <em>italic</em> and <a href="http://e.com">a link</a></p>'
    )
    expect(flattened).toBe('Bold and italic and a link')
  })
})

describe('resolveSpokenEnglish', () => {
  it('prefers the joined label', () => {
    expect(resolveSpokenEnglish({ label: 'Fluent' }, 'good')).toBe('Fluent')
  })

  it('falls back to the migrated legacy text', () => {
    expect(resolveSpokenEnglish(null, 'Good — conversational')).toBe('Good — conversational')
  })

  it('falls back again when neither is set', () => {
    expect(resolveSpokenEnglish(null, null)).toBe('—')
    expect(resolveSpokenEnglish({ label: '   ' }, '  ')).toBe('—')
  })
})

describe('studentSortName', () => {
  it('puts the surname first', () => {
    expect(studentSortName('Charlotte', 'Chan')).toBe('Chan, Charlotte')
  })

  it('handles a missing part without a stray comma', () => {
    expect(studentSortName('Charlotte', null)).toBe('Charlotte')
    expect(studentSortName(null, 'Chan')).toBe('Chan')
  })

  it('never returns an empty label', () => {
    expect(studentSortName(null, null)).toBe('Unnamed student')
  })
})

describe('profileName', () => {
  it('joins the parts', () => {
    expect(profileName({ first_name: 'Amy', surname: 'Wong' })).toBe('Amy Wong')
  })

  it('is null for an absent or nameless profile', () => {
    expect(profileName(null)).toBeNull()
    expect(profileName({ first_name: null, surname: null })).toBeNull()
  })
})

describe('formatExportDate', () => {
  it('formats an ISO timestamp', () => {
    expect(formatExportDate('2026-08-27T09:30:00.000Z')).toBe('27 Aug 2026')
  })

  it('is null for nothing and for rubbish', () => {
    expect(formatExportDate(null)).toBeNull()
    expect(formatExportDate('not a date')).toBeNull()
  })
})

describe('truncateForCell', () => {
  it('leaves a value inside the limit alone', () => {
    expect(truncateForCell('short', 10)).toBe('short')
  })

  it('truncates past the limit and marks the cut', () => {
    const result = truncateForCell('abcdefghij', 5)
    expect(result).toHaveLength(5)
    expect(result.endsWith('…')).toBe(true)
  })

  it('keeps a very long remark inside Excel’s hard cell limit', () => {
    expect(truncateForCell('x'.repeat(40_000)).length).toBeLessThanOrEqual(32_000)
  })
})

describe('toCellText', () => {
  it.each(['=1+1', '+1', '-1', '@SUM(A1)', '=HYPERLINK("http://e.com","click")'])(
    'passes %s through unchanged — no apostrophe corruption',
    (input) => {
      // Escaping belongs to CSV. Mangling the value here would show a literal
      // apostrophe in the cell; the workbook test proves the cell is inert.
      expect(toCellText(input)).toBe(input)
    }
  )

  it('preserves a hobbies field written as a dashed list', () => {
    expect(toCellText('- piano\n- swimming')).toBe('- piano\n- swimming')
  })

  it('trims surrounding whitespace', () => {
    expect(toCellText('  Piano, swimming  ')).toBe('Piano, swimming')
    expect(toCellText('\tvalue')).toBe('value')
  })

  it('is an empty string for nothing', () => {
    expect(toCellText(null)).toBe('')
  })

  it('truncates past the cell limit', () => {
    expect(toCellText('x'.repeat(40_000)).length).toBeLessThanOrEqual(32_000)
  })
})

describe('toCellDate', () => {
  it('returns a real Date so the column sorts as dates', () => {
    const date = toCellDate('2026-08-27T09:30:00.000Z')
    expect(date).toBeInstanceOf(Date)
    expect(date?.toISOString()).toBe('2026-08-27T09:30:00.000Z')
  })

  it('is null for nothing and for rubbish, never Invalid Date', () => {
    expect(toCellDate(null)).toBeNull()
    expect(toCellDate('not a date')).toBeNull()
  })
})

describe('exportFilename', () => {
  const payload = (names: string[]) => ({
    rows: names.map((studentName) => ({ studentName })),
    generatedOn: '2026-08-27T09:30:00.000Z',
  })

  it('names the student for a single export', () => {
    expect(exportFilename(payload(['Chan, Charlotte']), 'pdf')).toBe(
      'brief-introduction-chan-charlotte-2026-08-27.pdf'
    )
  })

  it('counts the students for a bulk export', () => {
    expect(exportFilename(payload(['Chan, Charlotte', 'Wong, Amy']), 'xlsx')).toBe(
      'brief-introductions-2-students-2026-08-27.xlsx'
    )
  })

  it('strips accents rather than producing a percent-encoded filename', () => {
    expect(exportFilename(payload(['Müller, Zoë']), 'pdf')).toBe(
      'brief-introduction-muller-zoe-2026-08-27.pdf'
    )
  })
})
