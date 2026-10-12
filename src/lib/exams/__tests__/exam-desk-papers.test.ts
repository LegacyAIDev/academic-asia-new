import { describe, it, expect } from 'vitest'
import type { ExamPaperStatus } from '@/lib/supabase/queries/exam-papers'
import { toExamDeskRows } from '../exam-desk-rows'
import { filterExamDeskRows, sortExamDeskRows } from '../exam-desk-filter-sort'
import { makeDeskBooking } from './exam-desk-fixture'

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`
const paper = (n: number, subject: string, year_level: string | null = null) => ({ id: id(n), subject, year_level })
const status = (files: number, links = 0, requestFromSchool = false): ExamPaperStatus => ({ requestFromSchool, files, links })
const booking = (bookingId: string, papers: ReturnType<typeof paper>[] | undefined, label = 'Entrance exam') =>
  makeDeskBooking({ id: bookingId, assessment_snapshot: papers ? { label, papers } : { label } })

describe('exam desk rows with papers', () => {
  it('carries the papers, their year levels in natural order and the live availability', () => {
    const papers = [paper(1, 'English', 'Year 10'), paper(2, 'Maths', 'Year 7'), paper(3, 'Science', 'Year 7')]
    const [row] = toExamDeskRows([booking('b1', papers)], new Map([[id(1), status(1)], [id(2), status(0, 1)]]))
    expect(row.papers.map(p => p.subject)).toEqual(['English', 'Maths', 'Science'])
    expect(row.yearLevels).toEqual(['Year 7', 'Year 10'])
    expect(row.availability).toMatchObject({ uploaded: 1, online: 1, notUploaded: 1, canPrint: true })
  })

  it('reads every paper as not uploaded when no status is given', () => {
    const [row] = toExamDeskRows([booking('b1', [paper(1, 'English')])])
    expect(row.availability).toMatchObject({ uploaded: 0, notUploaded: 1, canPrint: false })
  })

  it('leaves availability null for a booking without papers', () => {
    const rows = toExamDeskRows([booking('b1', undefined), makeDeskBooking({ assessment_snapshot: null })])
    expect(rows.map(r => r.availability)).toEqual([null, null])
    expect(rows.map(r => r.papers)).toEqual([[], []])
  })

  it('finds a row by a paper subject even when a custom label was typed', () => {
    const rows = toExamDeskRows([booking('b1', [paper(1, 'Reasoning')], 'Scholarship round'), booking('b2', [paper(2, 'Maths')])])
    const hits = filterExamDeskRows(rows, { roomId: null, schoolId: null, entryYear: null, q: 'reasoning' })
    expect(hits.map(r => r.bookingId)).toEqual(['b1'])
  })
})

describe('sorting the desk by papers', () => {
  const rows = toExamDeskRows(
    [
      booking('none', undefined),
      booking('one-missing', [paper(1, 'A'), paper(2, 'B')]),
      booking('two-missing', [paper(3, 'C'), paper(4, 'D'), paper(5, 'E')]),
      booking('all-ready', [paper(6, 'F')]),
    ],
    new Map([[id(1), status(1)], [id(6), status(2)]]),
  )
  const order = (dir: 'asc' | 'desc') => sortExamDeskRows(rows, 'papers', dir).map(r => r.bookingId)

  it('puts the most missing papers first in ascending order, rows without papers last', () => {
    expect(order('asc')).toEqual(['two-missing', 'one-missing', 'all-ready', 'none'])
  })

  it('reverses the papers but still keeps rows without papers last in descending order', () => {
    expect(order('desc')).toEqual(['all-ready', 'one-missing', 'two-missing', 'none'])
  })
})
