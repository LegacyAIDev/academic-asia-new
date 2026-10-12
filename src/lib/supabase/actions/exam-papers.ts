'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { assertAccess } from '@/lib/permissions/guard'
import { ACCESS, MODULES } from '@/lib/permissions/modules'
import { attachAccess } from '@/lib/attachments/attach-points'
import { isSafeExternalUrl } from '@/lib/attachments/constraints'
import { snapshotPapers } from '@/lib/scheduler/assessment-snapshot'
import { isUuid } from '@/lib/scheduler/uuid'
import { getExamPaperStatuses, getSchoolExamPaperOptions, type ExamPaperOption } from '@/lib/supabase/queries/exam-papers'
import { getAttachmentsForMany } from '@/lib/supabase/queries/record-attachments'
import { getAttachmentSignedUrl } from './record-attachment-signed-url'

type ActionResult<T = void> = { success: boolean; data?: T; error?: string }

export type BookingPaperFile = { paperId: string; subject: string; name: string; url: string; kind: 'file' | 'link' }
export type BookingPaperFiles = { files: BookingPaperFile[]; toRequest: string[]; schoolId: string | null }

/** A school's papers for the booking dialog. Only the format is returned, so scheduler access is enough. */
export async function getSchoolExamPaperOptionsAction(schoolId: string): Promise<ActionResult<ExamPaperOption[]>> {
  const denied = await assertAccess(MODULES.SCHEDULER, ACCESS.READ)
  if (denied) return denied
  if (!isUuid(schoolId)) return { success: false, error: 'Unknown school' }

  try {
    return { success: true, data: await getSchoolExamPaperOptions(schoolId) }
  } catch (error) {
    console.error('getSchoolExamPaperOptionsAction failed:', error)
    return { success: false, error: 'Failed to load the school\'s papers' }
  }
}

/**
 * The files and links behind "Print available" for one examination booking.
 * Exam team only. The browser sends nothing but the booking id: which papers
 * belong to it is read from the booking here, so a caller cannot ask for the
 * papers of an arbitrary exam.
 */
export async function getBookingPaperFilesAction(bookingId: string): Promise<ActionResult<BookingPaperFiles>> {
  const access = attachAccess('school_entrance_exam_paper')
  const denied = await assertAccess(access.module, access.read)
  if (denied) return denied
  if (!isUuid(bookingId)) return { success: false, error: 'Booking not found' }

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: booking, error } = await supabase
      .from('scheduler_bookings')
      .select('assessment_snapshot, school_id')
      .eq('id', bookingId)
      .maybeSingle()
    if (error) {
      console.error('getBookingPaperFilesAction: booking lookup failed:', error)
      return { success: false, error: 'Failed to load the papers' }
    }
    if (!booking) return { success: false, error: 'Booking not found' }

    const papers = snapshotPapers(booking.assessment_snapshot)
    const ids = papers.map(paper => paper.id)
    const [attachments, statuses] = await Promise.all([
      getAttachmentsForMany('school_entrance_exam_paper', ids),
      getExamPaperStatuses(ids),
    ])

    // Without the paper states a "request from school" paper could not be told apart, so nothing is listed.
    if (!statuses) return { success: false, error: 'Failed to load the papers' }

    const files: BookingPaperFile[] = []
    const toRequest: string[] = []
    for (const paper of papers) {
      if (statuses.get(paper.id)?.requestFromSchool) {
        toRequest.push(paper.subject)
        continue
      }
      for (const attachment of attachments.get(paper.id) ?? []) {
        const name = attachment.title || attachment.file_name || 'Paper'
        if (attachment.file_path) {
          const signed = await getAttachmentSignedUrl('school_entrance_exam_paper', attachment.file_path)
          if (signed.success && signed.data) files.push({ paperId: paper.id, subject: paper.subject, name, url: signed.data.url, kind: 'file' })
        } else if (attachment.external_url && isSafeExternalUrl(attachment.external_url)) {
          files.push({ paperId: paper.id, subject: paper.subject, name, url: attachment.external_url, kind: 'link' })
        }
      }
    }
    return { success: true, data: { files, toRequest, schoolId: booking.school_id } }
  } catch (error) {
    console.error('getBookingPaperFilesAction failed:', error)
    return { success: false, error: 'Failed to load the papers' }
  }
}
