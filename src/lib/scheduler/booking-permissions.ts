import { isExamBooking } from './config'

type CancelContext = {
  /** Scheduler edit access. */
  canWrite: boolean
  /** Exams edit access (examination officers and managers). */
  canConfirm: boolean
  status: string
  bookingType: string
}

/**
 * Whether to offer "Cancel booking". Mirrors the server rule in `cancelBooking`:
 * anyone with scheduler edit access may cancel, except that a confirmed
 * examination needs the examination team. Used by every place that shows the
 * action so it is never offered and then refused.
 */
export function canCancelBooking({ canWrite, canConfirm, status, bookingType }: CancelContext): boolean {
  if (!canWrite || status === 'cancelled') return false
  return canConfirm || !(status === 'confirmed' && isExamBooking(bookingType))
}
