import { describe, expect, it } from 'vitest'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import {
  EXAM_PAPER_ACCESS, EXAM_PAPER_ATTACHABLE_TYPE, EXAM_PAPER_CATEGORY_CODE, isExamPaperCategory, isExamPaperRow,
} from '../exam-paper-access'
import { ATTACH_POINTS } from '../attach-points'

describe('exam paper access rule', () => {
  it('needs the Exams write right both to read and to change a paper, and marks papers as restricted', () => {
    expect(EXAM_PAPER_ACCESS).toEqual({ module: MODULES.EXAMS, read: ACCESS.WRITE, write: ACCESS.WRITE, restricted: true })
  })

  it('names the same category and parent table as the attach point', () => {
    expect(ATTACH_POINTS.school_entrance_exam_paper.categoryCode).toBe(EXAM_PAPER_CATEGORY_CODE)
    expect(ATTACH_POINTS.school_entrance_exam_paper.attachableType).toBe(EXAM_PAPER_ATTACHABLE_TYPE)
  })
})

describe('isExamPaperCategory', () => {
  it('matches only the paper category', () => {
    expect(isExamPaperCategory('school_entrance_exam_paper')).toBe(true)
    expect(isExamPaperCategory('school_fee_schedule')).toBe(false)
    expect(isExamPaperCategory('exam_paper')).toBe(false)
    expect(isExamPaperCategory(null)).toBe(false)
    expect(isExamPaperCategory(undefined)).toBe(false)
    expect(isExamPaperCategory('')).toBe(false)
  })
})

describe('isExamPaperRow', () => {
  it('recognises a paper by its category', () => {
    expect(isExamPaperRow({ attachable_type: null, category: { code: 'school_entrance_exam_paper' } })).toBe(true)
  })

  it('recognises a paper by the record it is attached to, whatever its category says', () => {
    expect(isExamPaperRow({ attachable_type: 'school_entrance_exams', category: { code: 'other' } })).toBe(true)
    expect(isExamPaperRow({ attachable_type: 'school_entrance_exams', category: null })).toBe(true)
  })

  it('leaves other school files alone', () => {
    expect(isExamPaperRow({ attachable_type: 'school_fees', category: { code: 'school_fee_schedule' } })).toBe(false)
    expect(isExamPaperRow({ attachable_type: null, category: { code: 'school_prospectus' } })).toBe(false)
    expect(isExamPaperRow({})).toBe(false)
  })

  it('treats a missing row as not a paper', () => {
    expect(isExamPaperRow(null)).toBe(false)
    expect(isExamPaperRow(undefined)).toBe(false)
  })
})
