import { ACCESS, MODULES, type ModuleKey } from '@/lib/permissions/modules'

/**
 * Every place in the app where a record can carry a file or a link.
 *
 * The registry is the single source of truth: the UI passes one key, the server
 * action looks up the owner side, the category and the permission module from
 * here. Passing those individually at each call site made a typo a silently
 * mis-categorised row instead of a compile error.
 *
 * `attachableType` must appear in the matching CHECK constraint from
 * supabase/migrations/20260827092739_record_attachments.sql — attach-points.test.ts
 * asserts the two lists agree.
 */

export type AttachOwner = 'student' | 'school'

type AttachPoint = {
  owner: AttachOwner
  /** Parent table name, stored in attachable_type. */
  attachableType: string
  /** document_categories.code, resolved to an id at write time. */
  categoryCode: string
  /** Shown on the attach button and used in toasts. */
  label: string
}

export const ATTACH_POINTS = {
  student_exam_paper: {
    owner: 'student',
    attachableType: 'students',
    categoryCode: 'exam_paper',
    label: 'Exam paper',
  },
  student_qualification: {
    owner: 'student',
    attachableType: 'student_resume',
    categoryCode: 'qualification_certificate',
    label: 'Certificate',
  },
  student_exam_result: {
    owner: 'student',
    attachableType: 'student_exam_results',
    categoryCode: 'exam_result_doc',
    label: 'Result document',
  },
  student_visa: {
    owner: 'student',
    attachableType: 'student_visas',
    categoryCode: 'visa_document',
    label: 'Visa document',
  },
  student_travel: {
    owner: 'student',
    attachableType: 'student_travel',
    categoryCode: 'travel_document',
    label: 'Travel document',
  },
  student_application: {
    owner: 'student',
    attachableType: 'student_applications',
    categoryCode: 'application_document',
    label: 'Application document',
  },
  student_deposit: {
    owner: 'student',
    attachableType: 'student_application_deposits',
    categoryCode: 'deposit_receipt',
    label: 'Receipt',
  },
  school_entrance_exam_paper: {
    owner: 'school',
    attachableType: 'school_entrance_exams',
    categoryCode: 'school_entrance_exam_paper',
    label: 'Exam paper',
  },
  school_fee: {
    owner: 'school',
    attachableType: 'school_fees',
    categoryCode: 'school_fee_schedule',
    label: 'Fee schedule',
  },
  school_note: {
    owner: 'school',
    attachableType: 'school_notes',
    categoryCode: 'school_note_attachment',
    label: 'Attachment',
  },
  school_bank_detail: {
    owner: 'school',
    attachableType: 'school_bank_details',
    categoryCode: 'school_bank_document',
    label: 'Bank document',
  },
} as const satisfies Record<string, AttachPoint>

export type AttachPointKey = keyof typeof ATTACH_POINTS

export const ATTACH_POINT_KEYS = Object.keys(ATTACH_POINTS) as AttachPointKey[]

type OwnerConfig = {
  table: 'student_documents' | 'school_documents'
  bucket: 'student-documents' | 'school-documents'
  ownerColumn: 'student_id' | 'school_id'
  module: ModuleKey
  /** Path of the owner's detail page, for revalidation. */
  detailPath: (ownerId: string) => string
}

const OWNERS: Record<AttachOwner, OwnerConfig> = {
  student: {
    table: 'student_documents',
    bucket: 'student-documents',
    ownerColumn: 'student_id',
    module: MODULES.STUDENTS,
    detailPath: id => `/students/${id}`,
  },
  school: {
    table: 'school_documents',
    bucket: 'school-documents',
    ownerColumn: 'school_id',
    module: MODULES.SCHOOLS,
    detailPath: id => `/schools/${id}`,
  },
}

/** Table, bucket, owner column and permission module for an attach point. */
export function ownerConfig(point: AttachPointKey): OwnerConfig {
  return OWNERS[ATTACH_POINTS[point].owner]
}

/** Same config, addressed by owner rather than by attach point. */
export function ownerConfigFor(owner: AttachOwner): OwnerConfig {
  return OWNERS[owner]
}

/** Attachments inherit the parent entity's rights — there is no separate module. */
export const ATTACH_WRITE = ACCESS.WRITE
export const ATTACH_READ = ACCESS.READ
