import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'
import { snapshotPapers } from '@/lib/scheduler/assessment-snapshot'
import { assessmentLabel } from '@/lib/scheduler/booking-text-formatters'
import { isExamBooking, SCHEDULER_TIMEZONE, TIMEZONE_LABEL } from '@/lib/scheduler/config'
import { personName } from '@/lib/scheduler/person-name'
import { formatHkTime } from '@/lib/scheduler/time-utils'
import type { BookingDetail } from '@/lib/supabase/queries/scheduler-bookings'
import { examCandidates } from './exam-desk-rows'

/**
 * The cover slip is the sheet the exam team puts on a candidate's seat: who
 * sits there, when the exam starts and ends, and who invigilates. This module
 * decides what goes on each slip; the layout lives in cover-slip-html.ts.
 *
 * The field list is our own first version. The customer has a template of
 * their own that has not been shared yet, so expect it to change.
 */

export type CoverSlip = {
  studentName: string
  studentCode: string | null
  school: string | null
  /** "Wednesday 14 October 2026" */
  date: string
  /** "09:00 – 11:00 HKT" */
  time: string
  /** "Exam Room · 14/F R3", "Online", or null when no room is known. */
  room: string | null
  /** The seat number as printed, or null so the slip leaves a blank to fill in by hand. */
  seat: string | null
  invigilators: string[]
  assessment: string | null
  papers: { subject: string; duration: string | null }[]
}

type SlipBooking = Pick<BookingDetail, 'booking_type' | 'status'>

/** Only examinations that are still going ahead get a slip. */
export function isCoverSlipBooking(booking: SlipBooking): boolean {
  return isExamBooking(booking.booking_type) && booking.status !== 'cancelled'
}

function roomLine(booking: BookingDetail): string | null {
  if (booking.location_type === 'online') return 'Online'
  if (!booking.room) return null
  const locator = [booking.room.floor, booking.room.room_number].filter(Boolean).join(' ')
  return locator ? `${booking.room.display_name} · ${locator}` : booking.room.display_name
}

/** The staff added to the booking as officers; without any, the organiser is assumed to invigilate. */
function invigilators(booking: BookingDetail): string[] {
  const officers = booking.attendees
    .filter(attendee => attendee.role === 'officer' && attendee.profile)
    .map(attendee => personName(attendee.profile))
    .filter(Boolean)
  if (officers.length > 0) return officers
  const organiser = personName(booking.organiser)
  return organiser ? [organiser] : []
}

/** One slip per candidate, in seat order. A group examination gives one per student. */
export function buildCoverSlips(booking: BookingDetail): CoverSlip[] {
  const shared = {
    school: booking.school?.name ?? null,
    date: format(new TZDate(booking.start_at, SCHEDULER_TIMEZONE), 'EEEE d MMMM yyyy'),
    time: `${formatHkTime(booking.start_at)} – ${formatHkTime(booking.end_at)} ${TIMEZONE_LABEL}`,
    room: roomLine(booking),
    invigilators: invigilators(booking),
    assessment: assessmentLabel(booking.assessment_snapshot),
    papers: snapshotPapers(booking.assessment_snapshot).map(paper => ({
      subject: paper.subject,
      duration: paper.duration_minutes ? `${paper.duration_minutes} min` : null,
    })),
  }

  return examCandidates(booking).map(candidate => ({
    ...shared,
    studentName: candidate.name,
    studentCode: candidate.code,
    seat: candidate.seatNo ? String(candidate.seatNo) : null,
  }))
}

/** File name for the download: the exam date plus the student code, or "group" for several candidates. */
export function coverSlipFilename(booking: BookingDetail): string {
  const candidates = examCandidates(booking)
  const who = candidates.length === 1 ? candidates[0].code || 'student' : 'group'
  const safe = `${booking.local_date}-${who}`.replace(/[^a-zA-Z0-9-]/g, '-')
  return `cover-slip-${safe}.pdf`
}
