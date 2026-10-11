import { addMinutes } from 'date-fns'
import type { BookingFormInput } from './booking-schema'
import { DAY_START_TIME, DEFAULT_BOOKING_MINUTES } from './config'
import { combineBusinessDateTime } from './exam-booking-defaults'
import type { SchedulerView } from './search-params'
import { formatHkDate, normaliseSelection } from './time-utils'

/** A slot the user picked on the calendar: by click, drag or the right-click menu. */
export type SlotSelection = { start: string; end: string; allDay?: boolean; resourceId?: string }

/**
 * Turns a picked slot into booking dialog defaults. The column it was picked in
 * matters: in the Rooms view it pre-selects the room, in the Team view it adds
 * the colleague as an attendee or sets the student.
 */
export function prefillFromSelection(
  selection: SlotSelection | undefined,
  view: SchedulerView,
  currentProfileId: string,
): Partial<BookingFormInput> {
  if (!selection) return {}
  const slot = normaliseSelection(selection)
  const prefill: Partial<BookingFormInput> = { start_at: slot.start, end_at: slot.end }
  const resource = slot.resourceId
  if (!resource) return prefill

  if (view === 'rooms') return { ...prefill, room_id: resource, location_type: 'room' }
  if (view !== 'team') return prefill
  // A student's column means a meeting with that student, so start from a consultation.
  if (resource.startsWith('s:')) return { ...prefill, booking_type: 'consultation', student_id: resource.slice(2) }
  if (resource.startsWith('p:')) {
    const profileId = resource.slice(2)
    // The current user is already the organiser; only colleagues become attendees.
    if (profileId === currentProfileId) return prefill
    return {
      ...prefill,
      attendees: [{ profile_id: profileId, student_id: null, role: 'staff', seat_no: null, application_id: null }],
    }
  }
  return prefill
}

const GRID_DATE = /^\d{4}-\d{2}-\d{2}$/
const GRID_TIME = /^([01]\d|2[0-3]):[0-5]\d/

/**
 * Builds a slot from the attributes FullCalendar puts on its grid cells
 * (`data-date` YYYY-MM-DD, `data-time` HH:mm:ss, `data-resource-id`). Cells
 * without a time (month view, headers) start at the beginning of the business
 * day. Anything malformed yields null so the menu falls back to a plain
 * "New booking".
 */
export function slotFromGridAttributes(
  date: string | undefined,
  time: string | undefined,
  resourceId: string | undefined,
): SlotSelection | null {
  if (!date || !GRID_DATE.test(date)) return null
  const clock = time && GRID_TIME.test(time) ? time.slice(0, 5) : DAY_START_TIME
  const start = combineBusinessDateTime(date, clock)
  // Rejects dates such as 2026-02-30 that JavaScript would silently roll over.
  if (Number.isNaN(new Date(start).getTime()) || formatHkIsoDate(start) !== date) return null
  return { start, end: addMinutes(new Date(start), DEFAULT_BOOKING_MINUTES).toISOString(), resourceId: resourceId || undefined }
}

/** YYYY-MM-DD of an instant in the business timezone. */
function formatHkIsoDate(iso: string): string {
  const [day, month, year] = formatHkDate(iso).split('/')
  return `${year}-${month}-${day}`
}
