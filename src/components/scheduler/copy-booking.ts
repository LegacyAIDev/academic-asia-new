import { toast } from 'sonner'
import { formatBookingText, formatFamilyExamText } from '@/lib/scheduler/booking-text-formatters'
import { getBookingDetailsAction } from '@/lib/supabase/actions/scheduler-details'
import type { BookingDetail } from '@/lib/supabase/queries/scheduler-bookings'

export type CopyVariant = 'details' | 'family'

/** Copies a booking as plain text and confirms with a toast. */
export async function copyBookingText(booking: BookingDetail, variant: CopyVariant): Promise<void> {
  const text = variant === 'family' ? formatFamilyExamText(booking) : formatBookingText(booking)
  try {
    await navigator.clipboard.writeText(text)
    toast.success(variant === 'family' ? 'Family details copied' : 'Booking details copied')
  } catch {
    toast.error('Copy failed. Open the booking page and select the text instead.')
  }
}

class BookingLoadError extends Error {}

/**
 * Clipboard writes must start inside the click. The text is still being loaded,
 * so it is handed to the clipboard as a promise where the browser supports it
 * and written after loading everywhere else.
 */
async function writeWhenReady(text: Promise<string>): Promise<void> {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      const blob = text.then(value => new Blob([value], { type: 'text/plain' }))
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })])
      return
    } catch {
      // Fall back to writeText below.
    }
  }
  await navigator.clipboard.writeText(await text)
}

/** Loads a booking first, for places that only know its id (the right-click menu). */
export async function copyBookingById(bookingId: string, variant: CopyVariant): Promise<void> {
  const text = getBookingDetailsAction(bookingId).then(result => {
    if (!result.success || !result.data) throw new BookingLoadError(result.error ?? 'Could not load the booking')
    return variant === 'family' ? formatFamilyExamText(result.data.booking) : formatBookingText(result.data.booking)
  })
  try {
    await writeWhenReady(text)
    toast.success(variant === 'family' ? 'Family details copied' : 'Booking details copied')
  } catch (error) {
    toast.error(error instanceof BookingLoadError ? error.message : 'Copy failed. Open the booking page and select the text instead.')
  }
}
