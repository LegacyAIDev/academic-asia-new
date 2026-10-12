import { describe, it, expect } from 'vitest'
import {
  assessmentSnapshotSchema, labelAfterPaperChange, normaliseAssessmentSnapshot, snapshotLabelFromPapers, snapshotPapers,
} from '../assessment-snapshot'
import { bookingFormSchema } from '../booking-schema'

const ENGLISH = { id: '11111111-1111-4111-8111-111111111111', subject: 'English', year_level: 'Year 9', entry_year: '2027-28', duration_minutes: 45 }
const MATHS = { id: '22222222-2222-4222-8222-222222222222', subject: 'Mathematics', year_level: 'Year 9', entry_year: '2027-28', duration_minutes: 60 }
const REASONING = { id: '33333333-3333-4333-8333-333333333333', subject: 'Reasoning', year_level: 'Year 9', entry_year: '2027-28', duration_minutes: null }

describe('snapshotLabelFromPapers', () => {
  it('reads like a sentence for one, two and three subjects', () => {
    expect(snapshotLabelFromPapers([ENGLISH])).toBe('English')
    expect(snapshotLabelFromPapers([ENGLISH, MATHS])).toBe('English and Mathematics')
    expect(snapshotLabelFromPapers([ENGLISH, MATHS, REASONING])).toBe('English, Mathematics and Reasoning')
  })
  it('names a subject once even when two year levels of it are chosen', () => {
    expect(snapshotLabelFromPapers([ENGLISH, { subject: 'English' }, MATHS])).toBe('English and Mathematics')
  })
  it('is empty without papers', () => {
    expect(snapshotLabelFromPapers([])).toBe('')
  })
})

describe('labelAfterPaperChange', () => {
  it('clears a label that was named after the previous papers, so it follows the new ones', () => {
    expect(labelAfterPaperChange('English and Mathematics', [ENGLISH, MATHS])).toBe('')
    expect(labelAfterPaperChange('  English  ', [ENGLISH])).toBe('')
  })
  it('keeps a label somebody wrote', () => {
    expect(labelAfterPaperChange('Maths Entrance Test', [ENGLISH, MATHS])).toBe('Maths Entrance Test')
  })
  it('stays empty when nothing was typed', () => {
    expect(labelAfterPaperChange('', [])).toBe('')
    expect(labelAfterPaperChange(null, [ENGLISH])).toBe('')
    expect(labelAfterPaperChange(undefined, [])).toBe('')
  })
  it('renames the booking after the new papers on save once the old derived label is cleared', () => {
    const label = labelAfterPaperChange('English and Mathematics', [ENGLISH, MATHS])
    expect(normaliseAssessmentSnapshot({ label, version: null, notes: null, papers: [ENGLISH, REASONING] })?.label)
      .toBe('English and Reasoning')
  })
})

describe('normaliseAssessmentSnapshot', () => {
  const blank = { label: '', version: null, notes: null, papers: [] }

  it('turns an untouched assessment block into null', () => {
    expect(normaliseAssessmentSnapshot(blank)).toBeNull()
    expect(normaliseAssessmentSnapshot({ ...blank, label: '   ', version: ' ', notes: '' })).toBeNull()
    expect(normaliseAssessmentSnapshot(null)).toBeNull()
    expect(normaliseAssessmentSnapshot(undefined)).toBeNull()
  })
  it('keeps a typed label', () => {
    expect(normaliseAssessmentSnapshot({ ...blank, label: ' Maths Entrance Test ', papers: [ENGLISH] })?.label).toBe('Maths Entrance Test')
  })
  it('names the snapshot after its papers when no label was typed', () => {
    const snapshot = normaliseAssessmentSnapshot({ ...blank, papers: [ENGLISH, MATHS] })
    expect(snapshot).toEqual({ label: 'English and Mathematics', version: null, notes: null, papers: [ENGLISH, MATHS] })
  })
  it('still gives a label when only notes were written', () => {
    expect(normaliseAssessmentSnapshot({ ...blank, notes: 'Bring a calculator' })).toMatchObject({ label: 'Assessment', notes: 'Bring a calculator' })
  })
})

describe('assessmentSnapshotSchema', () => {
  it('accepts a snapshot saved before papers existed', () => {
    expect(assessmentSnapshotSchema.parse({ label: 'English · Year 9' })).toEqual({ label: 'English · Year 9', papers: [] })
  })
  it('rejects more than 20 papers and a paper without a valid id', () => {
    expect(assessmentSnapshotSchema.safeParse({ papers: Array.from({ length: 21 }, () => ENGLISH) }).success).toBe(false)
    expect(assessmentSnapshotSchema.safeParse({ papers: [{ ...ENGLISH, id: 'not-a-uuid' }] }).success).toBe(false)
  })
})

describe('snapshotPapers', () => {
  it('reads the papers of a stored snapshot and drops broken entries', () => {
    expect(snapshotPapers({ label: 'x', papers: [ENGLISH, { id: 'nope' }, 'text', MATHS] })).toEqual([ENGLISH, MATHS])
  })
  it('returns nothing for snapshots without papers or of an unexpected shape', () => {
    for (const value of [null, undefined, 'text', 7, [ENGLISH], { label: 'only a label' }, { papers: 'no' }]) {
      expect(snapshotPapers(value)).toEqual([])
    }
  })
})

describe('bookingFormSchema - assessment snapshot', () => {
  const exam = {
    title: 'Entrance exam',
    booking_type: 'examination',
    start_at: '2026-10-14T01:00:00.000Z',
    end_at: '2026-10-14T02:00:00.000Z',
    location_type: 'room',
    room_id: '44444444-4444-4444-8444-444444444444',
    student_id: '55555555-5555-4555-8555-555555555555',
  }

  it('saves an examination whose assessment fields were left empty', () => {
    const parsed = bookingFormSchema.safeParse({ ...exam, assessment_snapshot: { label: '', version: '', notes: '' } })
    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data.assessment_snapshot).toBeNull()
  })
  it('stores the chosen papers and labels them', () => {
    const parsed = bookingFormSchema.safeParse({ ...exam, assessment_snapshot: { label: '', papers: [ENGLISH, MATHS] } })
    expect(parsed.success && parsed.data.assessment_snapshot).toMatchObject({ label: 'English and Mathematics', papers: [ENGLISH, MATHS] })
  })
})
