/**
 * The dated history of one application, built from records that already exist:
 * registration, event, school visit, entrance exams, scheduler bookings,
 * deposits and recorded status changes. Anything without a date is left out,
 * since it cannot be placed.
 */

import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'
import { BOOKING_TYPE_LABELS, SCHEDULER_TIMEZONE, type BookingType } from '@/lib/scheduler/config'
import { assessmentLabel } from '@/lib/scheduler/booking-text-formatters'
import { formatHkTime } from '@/lib/scheduler/time-utils'
import type { ApplicationWithJoins } from '@/lib/supabase/queries/student-applications'
import type { ApplicationBooking } from '@/lib/supabase/queries/application-bookings'
import type { ApplicationStatusChange } from '@/lib/supabase/queries/application-status-history'
import { formatMoney } from './application-display'

/** Day the status history trigger went live; changes before it were never recorded. */
export const STATUS_HISTORY_START = '2026-10-20'

export type TimelineKind = 'registration' | 'event' | 'visit' | 'exam' | 'booking' | 'deposit' | 'status'

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

/**
 * "Status: Awaiting Offer → Offered", "Status set to Offered" or "Status removed
 * (was Offered)". Whether a side is set is decided by its id; the label is only
 * for display, so a status whose label cannot be read still reads as a change.
 */
function describeChange(
  noun: string,
  from: { id: number | null; label: string | null },
  to: { id: number | null; label: string | null },
): string {
  const name = (side: { id: number | null; label: string | null }) => side.label ?? `unknown (#${side.id})`
  if (from.id != null && to.id != null) return `${noun}: ${name(from)} → ${name(to)}`
  if (to.id != null) return `${noun} set to ${name(to)}`
  return `${noun} removed (was ${name(from)})`
}

/**
 * One entry per recorded change, dated in Hong Kong time like the bookings.
 * The title names the status change, or the sub-status change when only that
 * moved; when both moved the sub-status goes into the detail line.
 */
function statusEntries(changes: ApplicationStatusChange[]): TimelineEntry[] {
  return changes.map(change => {
    const statusMoved = change.from_status_id !== change.to_status_id
    const subStatusMoved = change.from_sub_status_id !== change.to_sub_status_id
    const subStatus = describeChange(
      'Sub-status',
      { id: change.from_sub_status_id, label: change.from_sub_status },
      { id: change.to_sub_status_id, label: change.to_sub_status },
    )
    const zoned = new TZDate(change.changed_at, SCHEDULER_TIMEZONE)
    return {
      date: format(zoned, 'yyyy-MM-dd'),
      time: format(zoned, 'HH:mm'),
      kind: 'status' as const,
      title: statusMoved
        ? describeChange('Status', { id: change.from_status_id, label: change.from_status }, { id: change.to_status_id, label: change.to_status })
        : subStatus,
      detail: joinParts([
        statusMoved && subStatusMoved ? subStatus : null,
        change.changed_by_name ? `by ${change.changed_by_name}` : null,
      ]),
    }
  })
}

/** Newest first; on the same day, timed entries before untimed ones and later times first. */
function newestFirst(a: TimelineEntry, b: TimelineEntry): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  if (a.time === b.time) return 0
  if (a.time === null) return 1
  if (b.time === null) return -1
  return a.time < b.time ? 1 : -1
}

export function buildApplicationTimeline(
  application: TimelineApplication,
  bookings: TimelineBooking[],
  statusChanges: ApplicationStatusChange[] = [],
): TimelineEntry[] {
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

  entries.push(...examEntries(application.exams), ...bookingEntries(bookings), ...statusEntries(statusChanges))
  return entries.map(entry => ({ ...entry, date: entry.date.slice(0, 10) })).sort(newestFirst)
}
