import { assessmentLabel } from '@/lib/scheduler/booking-text-formatters'
import { personName } from '@/lib/scheduler/person-name'
import type { ExamDeskBooking, ExamDeskStudent } from '@/lib/supabase/queries/exam-desk'

/**
 * Turns examination bookings into the rows the exam desk shows. One booking is
 * one row: a single examination has one candidate, a group examination lists
 * all of them and is handled as a whole. Pure, so the rules can be tested.
 */

export type ExamDeskCandidate = {
  studentId: string
  name: string
  /** "surname first name" in lower case, so lists sort the way a register does. */
  sortName: string
  code: string | null
  seatNo: number | null
}

export type ExamDeskRow = {
  bookingId: string
  bookingType: string
  startAt: string
  endAt: string
  localDate: string
  candidates: ExamDeskCandidate[]
  schoolId: string | null
  schoolName: string | null
  entryYear: number | null
  assessment: string | null
  roomId: string | null
  room: { display_name: string; floor: string | null; room_number: string | null } | null
  isOnline: boolean
  seatLabel: string | null
  status: 'pending' | 'confirmed'
  attendance: 'show_up' | 'no_show' | null
  /** Everything the search box looks through, lower-cased once. */
  searchText: string
}

export const EXAM_DESK_STATUS_LABELS = { pending: 'Awaiting confirmation', confirmed: 'Confirmed' } as const

/** Only what candidate listing needs, so a full booking detail can be passed as well. */
type CandidateSource = {
  student: ExamDeskStudent | null
  attendees: { role: string; seat_no: number | null; student: ExamDeskStudent | null }[]
}

function toCandidate(student: ExamDeskStudent, seatNo: number | null): ExamDeskCandidate {
  return {
    studentId: student.id,
    name: personName(student) || 'Unnamed student',
    sortName: `${student.surname ?? ''} ${student.first_name ?? ''}`.trim().toLowerCase(),
    code: student.student_code,
    seatNo,
  }
}

/** The students sitting the exam, by seat and then by name; falls back to the booking's own student. */
export function examCandidates(booking: CandidateSource): ExamDeskCandidate[] {
  const candidates = booking.attendees
    .filter(a => a.role === 'candidate' && a.student)
    .map(a => toCandidate(a.student as ExamDeskStudent, a.seat_no))
    .sort((a, b) => {
      if (a.seatNo !== b.seatNo) return (a.seatNo ?? Infinity) - (b.seatNo ?? Infinity)
      return a.sortName.localeCompare(b.sortName)
    })
  if (candidates.length > 0) return candidates
  return booking.student ? [toCandidate(booking.student, null)] : []
}

function seatLabel(candidates: ExamDeskCandidate[]): string | null {
  const seats = candidates.map(c => c.seatNo).filter((seat): seat is number => seat !== null)
  if (seats.length === 0) return null
  return seats.length === 1 ? `Seat ${seats[0]}` : `Seats ${seats.join(', ')}`
}

function toRow(booking: ExamDeskBooking): ExamDeskRow {
  const candidates = examCandidates(booking)
  // The booking form has no school field yet, so the linked application is the usual source.
  const school = booking.school ?? booking.application?.school ?? null
  const assessment = assessmentLabel(booking.assessment_snapshot)
  const searchable = [...candidates.flatMap(c => [c.name, c.code]), school?.name, assessment, booking.title]

  return {
    bookingId: booking.id,
    bookingType: booking.booking_type,
    startAt: booking.start_at,
    endAt: booking.end_at,
    localDate: booking.local_date,
    candidates,
    schoolId: school?.id ?? null,
    schoolName: school?.name ?? null,
    entryYear: booking.application?.entry_year ?? null,
    assessment,
    roomId: booking.room?.id ?? null,
    room: booking.room,
    isOnline: booking.location_type === 'online',
    seatLabel: seatLabel(candidates),
    status: booking.status === 'pending' ? 'pending' : 'confirmed',
    attendance: booking.attendance === 'show_up' || booking.attendance === 'no_show' ? booking.attendance : null,
    searchText: searchable.filter(Boolean).join(' ').toLowerCase(),
  }
}

export function toExamDeskRows(bookings: ExamDeskBooking[]): ExamDeskRow[] {
  return bookings.map(toRow)
}

/**
 * The two lists of the desk. A no-show stays on the booked list (the student
 * may still turn up late) but no longer counts as someone being waited for.
 */
export function splitExamDeskRows(rows: ExamDeskRow[]): { booked: ExamDeskRow[]; showedUp: ExamDeskRow[]; waiting: number } {
  const showedUp = rows.filter(row => row.attendance === 'show_up')
  const booked = rows.filter(row => row.attendance !== 'show_up')
  return { booked, showedUp, waiting: booked.filter(row => row.attendance === null).length }
}

export type ExamDeskActions = { confirm: boolean; showUp: boolean; noShow: boolean }

/**
 * Which buttons a row offers. They mirror what the database accepts: only a
 * confirmed booking can take attendance, so a pending one offers Confirm first.
 * "Showed up" stays available after a no-show for a student who arrives late.
 */
export function examDeskActions(row: Pick<ExamDeskRow, 'status' | 'attendance'>, canWrite: boolean): ExamDeskActions {
  const confirmed = canWrite && row.status === 'confirmed'
  return {
    confirm: canWrite && row.status === 'pending',
    showUp: confirmed && row.attendance !== 'show_up',
    noShow: confirmed && row.attendance === null,
  }
}
