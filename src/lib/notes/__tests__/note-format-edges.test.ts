import { describe, expect, it } from 'vitest'
import { NOTE_MAX_LENGTH, formatNoteDate, formatNoteTimestamp, isEdited, noteBodySchema, schoolNoteByline } from '../note-format'
import { toRecordNote } from '../record-note'
import { noteTarget } from '../note-targets'

const NOW = new Date('2026-10-23T10:00:00.000Z')
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString()
const DAY = 24 * 60 * 60 * 1000

describe('formatNoteDate edges', () => {
  it('switches from "Just now" at exactly one minute', () => {
    expect(formatNoteDate(ago(59_999), NOW)).toBe('Just now')
    expect(formatNoteDate(ago(60_000), NOW)).toBe('1 minute ago')
  })

  it('goes absolute at exactly seven days, not one millisecond earlier', () => {
    expect(formatNoteDate(ago(7 * DAY - 1), NOW)).toMatch(/ago$/)
    expect(formatNoteDate(ago(7 * DAY), NOW)).toBe('16 Oct 2026, 18:00')
    expect(formatNoteDate(ago(7 * DAY + 1), NOW)).toBe('16 Oct 2026, 17:59')
  })

  it('treats a slightly future timestamp (clock skew) as "Just now"', () => {
    expect(formatNoteDate(new Date(NOW.getTime() + 30_000).toISOString(), NOW)).toBe('Just now')
  })

  it('words nearer future timestamps relatively and far ones absolutely', () => {
    expect(formatNoteDate(new Date(NOW.getTime() + 2 * 3600_000).toISOString(), NOW)).toBe('in 2 hours')
    expect(formatNoteDate(new Date(NOW.getTime() + 8 * DAY).toISOString(), NOW)).toBe('31 Oct 2026, 18:00')
  })

  it('crosses Hong Kong midnight exactly at 16:00 UTC', () => {
    expect(formatNoteDate('2026-10-15T15:59:59.000Z', NOW)).toBe('15 Oct 2026, 23:59')
    expect(formatNoteDate('2026-10-15T16:00:00.000Z', NOW)).toBe('16 Oct 2026, 00:00')
  })
})

describe('formatNoteTimestamp', () => {
  it('includes seconds in Hong Kong time', () => {
    expect(formatNoteTimestamp('2026-10-14T01:30:45.000Z')).toBe('14 Oct 2026, 09:30:45')
  })
})

describe('isEdited threshold', () => {
  it('is false at exactly 60s and true one millisecond later', () => {
    expect(isEdited('2026-10-23T10:00:00.000Z', '2026-10-23T10:01:00.000Z')).toBe(false)
    expect(isEdited('2026-10-23T10:00:00.000Z', '2026-10-23T10:01:00.001Z')).toBe(true)
  })

  it('is false when updated_at is before created_at', () => {
    expect(isEdited('2026-10-23T10:05:00.000Z', '2026-10-23T10:00:00.000Z')).toBe(false)
  })
})

describe('noteBodySchema edges', () => {
  it('counts the limit after trimming', () => {
    expect(noteBodySchema.safeParse(`  ${'a'.repeat(NOTE_MAX_LENGTH)}  `).success).toBe(true)
    expect(noteBodySchema.safeParse(`  ${'a'.repeat(NOTE_MAX_LENGTH + 1)}  `).success).toBe(false)
  })

  it('refuses tabs, non-breaking spaces and CRLF-only input', () => {
    for (const blank of ['\t', ' ', '\r\n', ' \r\n\t ']) expect(noteBodySchema.safeParse(blank).success).toBe(false)
  })

  it('keeps inner CRLF line breaks and trims outer ones', () => {
    expect(noteBodySchema.parse('\r\nline one\r\nline two\r\n')).toBe('line one\r\nline two')
  })

  it('counts a CRLF as two characters toward the limit', () => {
    expect(noteBodySchema.safeParse('a'.repeat(NOTE_MAX_LENGTH - 2) + '\r\nb').success).toBe(false)
  })
})

describe('schoolNoteByline edges', () => {
  it('uses the created date, relative when recent, for notes with an author', () => {
    const line = schoolNoteByline({ authorName: 'X', createdBy: 'p', createdAt: new Date(Date.now() - 3600_000).toISOString(), legacyLastUpdate: '2019-01-01T00:00:00Z' })
    expect(line).toBe('X · 1 hour ago')
  })

  it('has no byline when nothing is known about who or when', () => {
    expect(schoolNoteByline({ authorName: null, createdBy: null, createdAt: null, legacyLastUpdate: null })).toBeNull()
  })

  it('ignores a name when there is no author id', () => {
    expect(schoolNoteByline({ authorName: 'Ghost', createdBy: null, createdAt: null, legacyLastUpdate: '2019-05-06T00:00:00.000Z' })).toBe('Old system · 6 May 2019')
  })

  it('names "Former staff" with the created date when the profile is gone', () => {
    expect(schoolNoteByline({ authorName: null, createdBy: 'gone', createdAt: '2020-01-02T01:30:00.000Z', legacyLastUpdate: null })).toBe('Former staff · 2 Jan 2020, 09:30')
  })
})

describe('toRecordNote author shapes', () => {
  const base = { id: 'n', body: 'b', created_at: 'c', updated_at: 'u', author_id: 'a' }

  it('leaves the name empty for a profile with blank names', () => {
    expect(toRecordNote({ ...base, author: { first_name: null, surname: null } }).authorName).toBeNull()
  })

  it('keeps a single-part name', () => {
    expect(toRecordNote({ ...base, author: { first_name: 'Olivia', surname: null } }).authorName).toBe('Olivia')
  })
})

describe('noteTarget prototype keys', () => {
  it('finds nothing for Object.prototype names', () => {
    for (const key of ['__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty', 'prototype']) expect(noteTarget(key)).toBeUndefined()
  })
})
