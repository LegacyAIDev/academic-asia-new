import { describe, expect, it } from 'vitest'
import { ATTACH_POINTS, ATTACH_POINT_KEYS, ownerConfig, ownerConfigFor } from '../attach-points'
import { MODULES } from '@/lib/permissions/modules'

/**
 * The same knowledge lives in three places — this registry, the CHECK
 * constraints and the category seeds, both in
 * supabase/migrations/20260827092739_record_attachments.sql. These tests are what
 * stops the three drifting apart.
 */

// Mirrors student_documents_attachable_type_ck.
const STUDENT_TYPES = [
  'students', 'student_visas', 'student_travel', 'student_exam_results',
  'student_resume', 'student_applications', 'student_application_deposits',
]

// Mirrors school_documents_attachable_type_ck.
const SCHOOL_TYPES = [
  'schools', 'school_entrance_exams', 'school_fees', 'school_notes', 'school_bank_details',
]

// Every category code seeded across migrations 060, 070, 071, 074, the two
// school rounds, and the record_attachments migration.
const SEEDED_CATEGORY_CODES = [
  'school_report', 'exam_certificate', 'special_talent', 'passport_copy', 'visa_document', 'other',
  'cv', 'birth_certificate', 'music_achievement', 'aa_test_doc', 'ukiset', 'ielts',
  'report_and_certificate', 'aa_test_math_grammar', 'aa_test_essay',
  'school_prospectus', 'school_agreement', 'school_brochure', 'school_fee_schedule',
  'school_factsheet', 'school_exam_results', 'school_application', 'school_gallery',
  'school_guardianship', 'school_pre_arrival', 'school_medical', 'school_correspondence',
  'school_curriculum', 'school_scholarship', 'school_summer_programme', 'school_term_dates',
  'travel_document', 'exam_paper', 'qualification_certificate', 'exam_result_doc',
  'application_document', 'deposit_receipt',
  'school_entrance_exam_paper', 'school_note_attachment', 'school_bank_document',
]

describe('ATTACH_POINTS registry', () => {
  it('has at least one attach point', () => {
    expect(ATTACH_POINT_KEYS.length).toBeGreaterThan(0)
  })

  it.each(ATTACH_POINT_KEYS)('%s uses an attachable_type the DB constraint allows', key => {
    const point = ATTACH_POINTS[key]
    const allowed = point.owner === 'student' ? STUDENT_TYPES : SCHOOL_TYPES
    expect(allowed).toContain(point.attachableType)
  })

  it.each(ATTACH_POINT_KEYS)('%s points at a seeded category code', key => {
    expect(SEEDED_CATEGORY_CODES).toContain(ATTACH_POINTS[key].categoryCode)
  })

  it.each(ATTACH_POINT_KEYS)('%s has a non-empty label for the attach button', key => {
    expect(ATTACH_POINTS[key].label.trim().length).toBeGreaterThan(0)
  })

  it('never reuses the same table and category pair twice', () => {
    const pairs = ATTACH_POINT_KEYS.map(k =>
      `${ATTACH_POINTS[k].attachableType}:${ATTACH_POINTS[k].categoryCode}`)
    expect(new Set(pairs).size).toBe(pairs.length)
  })
})

describe('ownerConfig', () => {
  it('routes student points to the student table, bucket and module', () => {
    const cfg = ownerConfig('student_visa')
    expect(cfg).toMatchObject({
      table: 'student_documents',
      bucket: 'student-documents',
      ownerColumn: 'student_id',
      module: MODULES.STUDENTS,
    })
    expect(cfg.detailPath('abc')).toBe('/students/abc')
  })

  it('routes school points to the school table, bucket and module', () => {
    const cfg = ownerConfig('school_fee')
    expect(cfg).toMatchObject({
      table: 'school_documents',
      bucket: 'school-documents',
      ownerColumn: 'school_id',
      module: MODULES.SCHOOLS,
    })
    expect(cfg.detailPath('xyz')).toBe('/schools/xyz')
  })

  it('resolves the same config when addressed by owner directly', () => {
    expect(ownerConfigFor('student')).toEqual(ownerConfig('student_visa'))
    expect(ownerConfigFor('school')).toEqual(ownerConfig('school_note'))
  })
})
