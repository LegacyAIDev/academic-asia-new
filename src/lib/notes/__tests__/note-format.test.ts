import { describe, expect, it } from 'vitest'
import { NOTE_MAX_LENGTH, formatNoteDate, isEdited, noteBodySchema, schoolNoteByline } from '../note-format'
import { toRecordNote } from '../record-note'

const NOW = new Date('2026-10-23T10:00:00.000Z')

describe('formatNoteDate', () => {
  it('says "Just now" inside the first minute', () => {
    expect(formatNoteDate('2026-10-23T09:59:40.000Z', NOW)).toBe('Just now')
  })

  it('is relative for less than a week', () => {
    expect(formatNoteDate('2026-10-23T07:00:00.000Z', NOW)).toBe('3 hours ago')
    expect(formatNoteDate('2026-10-20T10:00:00.000Z', NOW)).toBe('3 days ago')
  })

  it('is absolute in Hong Kong time from seven days on', () => {
    // 01:30 UTC is 09:30 in Hong Kong.
    expect(formatNoteDate('2026-10-14T01:30:00.000Z', NOW)).toBe('14 Oct 2026, 09:30')
    expect(formatNoteDate('2026-10-16T10:00:00.000Z', NOW)).toBe('16 Oct 2026, 18:00')
  })

  it('rolls over to the next Hong Kong day late in the evening UTC', () => {
    expect(formatNoteDate('2026-09-01T17:00:00.000Z', NOW)).toBe('2 Sep 2026, 01:00')
  })
})

describe('isEdited', () => {
  it('ignores changes within the first minute', () => {
    expect(isEdited('2026-10-23T10:00:00.000Z', '2026-10-23T10:00:00.000Z')).toBe(false)
    expect(isEdited('2026-10-23T10:00:00.000Z', '2026-10-23T10:01:00.000Z')).toBe(false)
  })

  it('marks a note changed later than a minute after it was written', () => {
    expect(isEdited('2026-10-23T10:00:00.000Z', '2026-10-23T10:01:01.000Z')).toBe(true)
  })
})

describe('noteBodySchema', () => {
  it('trims the text', () => {
    expect(noteBodySchema.parse('  called the parents \n')).toBe('called the parents')
  })

  it('refuses empty and whitespace-only notes', () => {
    expect(noteBodySchema.safeParse('').success).toBe(false)
    expect(noteBodySchema.safeParse('  \n ').success).toBe(false)
  })

  it('allows exactly the limit and refuses one more', () => {
    expect(noteBodySchema.safeParse('a'.repeat(NOTE_MAX_LENGTH)).success).toBe(true)
    const tooLong = noteBodySchema.safeParse('a'.repeat(NOTE_MAX_LENGTH + 1))
    expect(tooLong.success).toBe(false)
    expect(tooLong.error?.issues[0].message).toBe('Notes can be up to 5,000 characters')
  })
})

describe('schoolNoteByline', () => {
  it('names the author and the date for new notes', () => {
    const line = schoolNoteByline({ authorName: 'Olivia Wong', createdBy: 'p1', createdAt: '2020-01-02T01:30:00.000Z', legacyLastUpdate: null })
    expect(line).toBe('Olivia Wong · 2 Jan 2020, 09:30')
  })

  it('calls imported notes "Old system" with the date the old system gave', () => {
    const line = schoolNoteByline({ authorName: null, createdBy: null, createdAt: '2026-08-01T00:00:00.000Z', legacyLastUpdate: '2019-05-06T00:00:00.000Z' })
    expect(line).toBe('Old system · 6 May 2019')
  })

  it('shows only the date for a note written here before authors were recorded', () => {
    // Not imported (no old-system date), so it must not read "Old system", and no name is guessed.
    expect(schoolNoteByline({ authorName: null, createdBy: null, createdAt: '2026-08-01T00:00:00.000Z', legacyLastUpdate: null })).toBe('1 Aug 2026, 08:00')
    expect(schoolNoteByline({ authorName: null, createdBy: 'gone', createdAt: null, legacyLastUpdate: null })).toBe('Former staff')
  })
})

describe('toRecordNote', () => {
  it('joins the author name, or leaves it empty for former staff', () => {
    const row = { id: 'n1', body: 'x', created_at: 'a', updated_at: 'b', author_id: 'u1', author: { first_name: 'Olivia', surname: 'Wong' } }
    expect(toRecordNote(row)).toEqual({ id: 'n1', body: 'x', createdAt: 'a', updatedAt: 'b', authorId: 'u1', authorName: 'Olivia Wong' })
    expect(toRecordNote({ ...row, author_id: null, author: null })).toMatchObject({ authorId: null, authorName: null })
  })
})
