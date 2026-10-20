/**
 * The dated history of one application, built from records that already exist:
 * registration, event, school visit, entrance exams, scheduler bookings and
 * deposits. Anything without a date is left out, since it cannot be placed.
 */

import { BOOKING_TYPE_LABELS, type BookingType } from '@/lib/scheduler/config'
import { assessmentLabel } from '@/lib/scheduler/booking-text-formatters'
import { formatHkTime } from '@/lib/scheduler/time-utils'
import type { ApplicationWithJoins } from '@/lib/supabase/queries/student-applications'
import type { ApplicationBooking } from '@/lib/supabase/queries/application-bookings'
import { formatMoney } from './application-display'

export type TimelineKind = 'registration' | 'event' | 'visit' | 'exam' | 'booking' | 'deposit'

export type TimelineEntry = {
  /** yyyy-mm-dd */
  date: string
  /** HH:mm, or null when only the day is known */
  time: string | null
  kind: TimelineKind
  title: string
  detail: string | null
}

export type TimelineApplication = Pick<
  ApplicationWithJoins,
  'registration_date' | 'event_date' | 'event_time' | 'event' | 'visit_date' | 'visit_time' | 'school_contact' | 'deposits' | 'exams'
>

export type TimelineBooking = Pick<
  ApplicationBooking,
  'id' | 'title' | 'booking_type' | 'status' | 'attendance' | 'start_at' | 'local_date' | 'assessment_snapshot'
>

const ATTENDANCE_LABELS: Record<string, string> = { show_up: 'Showed up', no_show: 'No show' }

const shortTime = (value: string | null) => (value ? value.slice(0, 5) : null)
const joinParts = (parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' · ') || null
const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

function examEntries(exams: TimelineApplication['exams']): TimelineEntry[] {
  return exams.flatMap(exam => {
    const confirmed = Boolean(exam.confirmed_date)
    const date = exam.confirmed_date ?? exam.preferred_date
    if (!date) return []
    return [{
      date,
      time: shortTime(confirmed ? exam.confirmed_start_time : exam.preferred_start_time),
      kind: 'exam' as const,
      title: `Entrance exam: ${exam.subject ?? 'Exam'}`,
      detail: joinParts([
        confirmed ? null : 'Preferred date, not confirmed',
        exam.score != null ? `Score ${exam.score}` : null,
      ]),
    }]
  })
}

function bookingEntries(bookings: TimelineBooking[]): TimelineEntry[] {
  return bookings.map(booking => ({
    date: booking.local_date,
    time: formatHkTime(booking.start_at),
    kind: 'booking' as const,
    title: BOOKING_TYPE_LABELS[booking.booking_type as BookingType] ?? booking.title,
    detail: joinParts([
      assessmentLabel(booking.assessment_snapshot),
      capitalise(booking.status),
      booking.attendance ? ATTENDANCE_LABELS[booking.attendance] ?? booking.attendance : null,
    ]),
  }))
}

/** Newest first; on the same day, timed entries before untimed ones and later times first. */
function newestFirst(a: TimelineEntry, b: TimelineEntry): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  if (a.time === b.time) return 0
  if (a.time === null) return 1
  if (b.time === null) return -1
  return a.time < b.time ? 1 : -1
}

export function buildApplicationTimeline(application: TimelineApplication, bookings: TimelineBooking[]): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  if (application.registration_date) {
    entries.push({ date: application.registration_date, time: null, kind: 'registration', title: 'Registered with the school', detail: null })
  }
  if (application.event_date) {
    entries.push({
      date: application.event_date,
      time: shortTime(application.event_time),
      kind: 'event',
      title: application.event?.name ? `Event: ${application.event.name}` : 'Event',
      detail: null,
    })
  }
  if (application.visit_date) {
    entries.push({
      date: application.visit_date,
      time: shortTime(application.visit_time),
      kind: 'visit',
      title: 'School visit',
      detail: application.school_contact ? `With ${application.school_contact}` : null,
    })
  }
  for (const deposit of application.deposits) {
    if (!deposit.deposit_date) continue
    entries.push({
      date: deposit.deposit_date,
      time: null,
      kind: 'deposit',
      title: 'Deposit paid',
      detail: deposit.amount != null ? `Amount ${formatMoney(deposit.amount)}` : null,
    })
  }

  entries.push(...examEntries(application.exams), ...bookingEntries(bookings))
  return entries.map(entry => ({ ...entry, date: entry.date.slice(0, 10) })).sort(newestFirst)
}
