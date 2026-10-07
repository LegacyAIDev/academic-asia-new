/**
 * Scheduler configuration shared by the calendar UI, server actions and validation.
 *
 * The business timezone is Hong Kong (spec WEB-07/WEB-16). The same literal is
 * mirrored in SQL (scheduler_calendar_items view and the booking RPCs), so keep both in sync.
 */
export const SCHEDULER_TIMEZONE = 'Asia/Hong_Kong'
export const TIMEZONE_LABEL = 'HKT'

export const SLOT_MINUTES = 15
export const DAY_START_TIME = '09:00'
export const DAY_END_TIME = '21:00'
export const DEFAULT_BOOKING_MINUTES = 60
export const MAX_RANGE_DAYS = 62

export const BOOKING_TYPES = [
  'examination',
  'group_examination',
  'consultation',
  'school_interview',
  'internal_meeting',
  'room_reservation',
  'other',
] as const
export type BookingType = (typeof BOOKING_TYPES)[number]

export const BOOKING_TYPE_LABELS: Record<BookingType, string> = {
  examination: 'Examination',
  group_examination: 'Group examination',
  consultation: 'Consultation',
  school_interview: 'School interview',
  internal_meeting: 'Internal meeting',
  room_reservation: 'Room reservation',
  other: 'Other',
}

/** Exam types start as pending and are confirmed by the examination team. */
export const EXAM_BOOKING_TYPES: BookingType[] = ['examination', 'group_examination']

export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled'] as const
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

/** A booking either takes place in a physical room or online. */
export const LOCATION_TYPES = ['room', 'online'] as const
export type LocationType = (typeof LOCATION_TYPES)[number]

export const ATTENDEE_ROLES = ['organiser', 'officer', 'consultant', 'staff', 'candidate', 'attendee'] as const
export type AttendeeRole = (typeof ATTENDEE_ROLES)[number]

/**
 * FullCalendar Premium license key. The evaluation key is allowed while developing;
 * the purchased key replaces it via NEXT_PUBLIC_FULLCALENDAR_LICENSE_KEY before go-live.
 */
export const FULLCALENDAR_LICENSE_KEY =
  process.env.NEXT_PUBLIC_FULLCALENDAR_LICENSE_KEY || 'CC-Attribution-NonCommercial-NoDerivatives'
