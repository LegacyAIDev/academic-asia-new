import { z } from 'zod'
import { ATTENDEE_ROLES, BOOKING_TYPES, LOCATION_TYPES } from './config'

/**
 * Shared validation for the booking dialog and the saveBooking action.
 * Room capacity and seat clashes are enforced by the database; this schema
 * covers the shape of a booking and the fields each booking type needs.
 */

const uuid = z.string().uuid()
const optionalUuid = uuid.nullable().optional()
const isoDatetime = z.string().datetime({ offset: true })
const longText = z.string().max(2000).nullable().optional()

export const attendeeSchema = z
  .object({
    profile_id: optionalUuid,
    student_id: optionalUuid,
    role: z.enum(ATTENDEE_ROLES).default('attendee'),
    seat_no: z.number().int().positive().nullable().optional(),
    application_id: optionalUuid,
  })
  .refine(a => Boolean(a.profile_id) !== Boolean(a.student_id), {
    message: 'An attendee is either a staff member or a student',
  })

export type AttendeeInput = z.infer<typeof attendeeSchema>

export const assessmentSnapshotSchema = z.object({
  label: z.string().trim().min(1).max(200),
  version: z.string().max(50).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

const baseBookingSchema = z.object({
  id: uuid.optional(),
  title: z.string().trim().min(1, 'Title is required').max(200),
  booking_type: z.enum(BOOKING_TYPES),
  status: z.enum(['pending', 'confirmed']).optional(),
  start_at: isoDatetime,
  end_at: isoDatetime,
  location_type: z.enum(LOCATION_TYPES).default('room'),
  room_id: optionalUuid,
  seats_required: z.number().int().positive().default(1),
  is_exclusive: z.boolean().default(false),
  organiser_id: optionalUuid,
  student_id: optionalUuid,
  application_id: optionalUuid,
  exam_id: optionalUuid,
  assessment_set_id: optionalUuid,
  assessment_snapshot: assessmentSnapshotSchema.nullable().optional(),
  school_id: optionalUuid,
  online_link: z
    .string()
    .trim()
    .max(500)
    .refine(v => v === '' || /^https?:\/\//i.test(v), 'Link must start with http:// or https://')
    .nullable()
    .optional(),
  notes: longText,
  instructions: longText,
  attendees: z.array(attendeeSchema).max(60).default([]),
  reason: z.string().trim().min(3, 'Please give a reason').max(500).optional(),
  override_person_conflicts: z.boolean().default(false),
})

/** Fields each booking type must have on top of the shared base (spec §10.2). */
const TYPE_RULES: Record<z.infer<typeof baseBookingSchema>['booking_type'], (v: z.infer<typeof baseBookingSchema>, issue: (path: string, message: string) => void) => void> = {
  examination: (v, issue) => {
    if (!v.student_id) issue('student_id', 'Select the student sitting the exam')
    if (v.location_type !== 'room') issue('location_type', 'Examinations take place in a room')
  },
  group_examination: (v, issue) => {
    const candidates = v.attendees.filter(a => a.role === 'candidate').length
    if (candidates < 1) issue('attendees', 'Add at least one candidate')
    if (v.seats_required < candidates) issue('seats_required', 'Seats required must cover all candidates')
    if (v.location_type !== 'room') issue('location_type', 'Group examinations take place in a room')
  },
  consultation: (v, issue) => {
    if (!v.student_id) issue('student_id', 'Select the student or family')
  },
  school_interview: (v, issue) => {
    if (!v.student_id) issue('student_id', 'Select the student being interviewed')
  },
  internal_meeting: () => {},
  room_reservation: (v, issue) => {
    if (v.location_type !== 'room') issue('location_type', 'A room reservation needs a room')
    if (!v.notes?.trim()) issue('notes', 'Describe the purpose of the reservation')
  },
  other: () => {},
}

export const bookingFormSchema = baseBookingSchema.superRefine((v, ctx) => {
  const issue = (path: string, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message })

  if (new Date(v.end_at) <= new Date(v.start_at)) issue('end_at', 'End must be after start')

  if (v.location_type === 'room' && !v.room_id) issue('room_id', 'Select a room')
  if (v.location_type === 'online') {
    if (v.room_id) issue('room_id', 'An online booking cannot have a room')
    if (!v.online_link) issue('online_link', 'Add the meeting link')
  }

  const seats = v.attendees.map(a => a.seat_no).filter((s): s is number => typeof s === 'number')
  if (seats.length > 0 && v.location_type !== 'room') issue('attendees', 'Seats need a room')
  if (new Set(seats).size !== seats.length) issue('attendees', 'Duplicate seat numbers')

  TYPE_RULES[v.booking_type](v, issue)
})

export type BookingFormInput = z.input<typeof bookingFormSchema>
export type BookingFormValues = z.output<typeof bookingFormSchema>

export const cancelReasonSchema = z.object({
  reason: z.string().trim().min(3, 'Please give a reason').max(500),
})

export const moveBookingSchema = z.object({
  start_at: isoDatetime,
  end_at: isoDatetime,
  room_id: optionalUuid,
  reason: z.string().trim().min(3, 'Please give a reason').max(500),
})

export type MoveBookingInput = z.infer<typeof moveBookingSchema>
