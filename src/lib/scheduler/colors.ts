import type { BookingType } from './config'

/** Calendar colour per booking type (Tailwind 500-ish hues, readable with white text). */
export const TYPE_COLORS: Record<BookingType, string> = {
  examination: '#dc2626',
  group_examination: '#b91c1c',
  consultation: '#16a34a',
  school_interview: '#7c3aed',
  internal_meeting: '#2563eb',
  room_reservation: '#64748b',
  other: '#475569',
}

/** Distinct hues for people in the team overlay view. */
export const PERSON_PALETTE = [
  '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777',
  '#0891b2', '#ea580c', '#4f46e5', '#059669', '#9333ea',
]

export function colorForIndex(index: number): string {
  return PERSON_PALETTE[index % PERSON_PALETTE.length]
}

export function colorForType(type: string): string {
  return TYPE_COLORS[type as BookingType] ?? TYPE_COLORS.other
}
