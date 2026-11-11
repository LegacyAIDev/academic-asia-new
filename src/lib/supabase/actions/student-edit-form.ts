'use server'

import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { getReferenceData, getStudentById } from '@/lib/supabase/queries/students'
import { getPresentSchools } from '@/lib/supabase/queries/present-schools'
import { getAttachmentsFor } from '@/lib/supabase/queries/record-attachments'

/**
 * Everything the edit-details drawer needs, loaded when it opens rather than
 * with every visit to a student, since most visits never edit.
 */
export async function loadStudentEditForm(id: string) {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied

  const [student, referenceData, presentSchools, examPaperAttachments] = await Promise.all([
    getStudentById(id),
    getReferenceData(),
    getPresentSchools(),
    getAttachmentsFor('student_exam_paper', id),
  ])
  if (!student) return { success: false as const, error: 'This student no longer exists.' }
  return { success: true as const, data: { student, referenceData, presentSchools, examPaperAttachments } }
}

/** What the add-student drawer needs: the dropdown choices, loaded when it opens. */
export async function loadStudentCreateForm() {
  const denied = await assertAccess(MODULES.STUDENTS, ACCESS.WRITE)
  if (denied) return denied
  const [referenceData, presentSchools] = await Promise.all([getReferenceData(), getPresentSchools()])
  return { success: true as const, data: { referenceData, presentSchools } }
}
