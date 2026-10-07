import { addMinutes } from 'date-fns'
import { DEFAULT_BOOKING_MINUTES } from './config'
import { roundUpToSlot } from './time-utils'
import type { AttendeeInput, BookingFormInput } from './booking-schema'
import type { BookingDetail } from '@/lib/supabase/queries/scheduler-bookings'

/**
 * Fresh values for a new booking. `partial` prefills fields from context (e.g.
 * a clicked calendar slot); anything it doesn't set falls back to a blank
 * internal meeting starting at the next 15-minute HK slot.
 */
export function defaultBookingInput(partial: Partial<BookingFormInput>, currentProfileId: string): BookingFormInput {
  const start = partial.start_at ?? roundUpToSlot(new Date()).toISOString()
  const end = partial.end_at ?? addMinutes(new Date(start), DEFAULT_BOOKING_MINUTES).toISOString()

  return {
    title: '',
    booking_type: 'internal_meeting',
    location_type: 'room',
    room_id: null,
    seats_required: 1,
    is_exclusive: false,
    organiser_id: currentProfileId,
    student_id: null,
    application_id: null,
    exam_id: null,
    assessment_set_id: null,
    assessment_snapshot: null,
    school_id: null,
    online_link: null,
    notes: null,
    instructions: null,
    attendees: [],
    override_person_conflicts: false,
    ...partial,
    start_at: start,
    end_at: end,
  }
}

/** Loads an existing booking into the form shape; conflicts are re-checked fresh on save. */
export function bookingDetailToFormInput(detail: BookingDetail): BookingFormInput {
  const status = detail.status === 'pending' || detail.status === 'confirmed' ? detail.status : undefined

  return {
    id: detail.id,
    title: detail.title,
    booking_type: detail.booking_type as BookingFormInput['booking_type'],
    status,
    start_at: detail.start_at,
    end_at: detail.end_at,
    location_type: detail.location_type as BookingFormInput['location_type'],
    room_id: detail.room_id,
    seats_required: detail.seats_required,
    is_exclusive: detail.is_exclusive,
    organiser_id: detail.organiser_id,
    student_id: detail.student_id,
    application_id: detail.application_id,
    exam_id: detail.exam_id,
    assessment_set_id: detail.assessment_set_id,
    assessment_snapshot: detail.assessment_snapshot as BookingFormInput['assessment_snapshot'],
    school_id: detail.school_id,
    online_link: detail.online_link,
    notes: detail.notes,
    instructions: detail.instructions,
    attendees: detail.attendees.map(a => ({
      profile_id: a.profile_id,
      student_id: a.student_id,
      role: a.role as AttendeeInput['role'],
      seat_no: a.seat_no,
      application_id: a.application_id,
    })),
    override_person_conflicts: false,
  }
}

function personName(person: { first_name: string | null; surname: string | null } | null): string | null {
  if (!person) return null
  return [person.first_name, person.surname].filter(Boolean).join(' ') || null
}

/** id -> display name for everyone already attached to a booking (organiser, student, attendees). */
export function bookingDetailPeopleLabels(detail: BookingDetail): Record<string, string> {
  const labels: Record<string, string> = {}

  const add = (id: string | null | undefined, person: { first_name: string | null; surname: string | null } | null) => {
    if (!id) return
    const name = personName(person)
    if (name) labels[id] = name
  }

  add(detail.organiser_id, detail.organiser)
  add(detail.student_id, detail.student)
  for (const attendee of detail.attendees) {
    add(attendee.profile_id, attendee.profile)
    add(attendee.student_id, attendee.student)
  }

  return labels
}
