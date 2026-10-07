/**
 * Turns database errors raised by the scheduler triggers and RPCs into text a
 * staff member can act on. Custom SQLSTATEs are raised in
 * supabase/migrations/*_scheduler_core.sql.
 */

type PgLikeError = { code?: string; message?: string } | null | undefined

const MESSAGES: Record<string, string> = {
  SR001: 'That room is exclusively booked for this time.',
  SR003: 'The seat number is outside the room capacity.',
  SR004: 'A reason is required.',
  SR006: 'That room is inactive and cannot be booked.',
  '23P01': 'That seat is already taken for this time.',
  P0002: 'Booking not found or already cancelled.',
  '23514': 'Invalid booking times, location or link.',
  '22P02': 'Invalid booking data.',
  '23505': 'This name is already in use.',
}

export function mapSchedulerError(error: PgLikeError, fallback = 'Something went wrong. Please try again.'): string {
  if (!error) return fallback
  if (error.code === 'SR002') return error.message || 'Room capacity exceeded.'
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code]
  return error.message || fallback
}
