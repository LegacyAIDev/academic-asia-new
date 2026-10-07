'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { BookingDialog } from '@/components/scheduler/booking-dialog'
import type { BookingFormInput } from '@/lib/scheduler/booking-schema'
import { getBookingDialogContextAction, type BookingDialogContext } from '@/lib/supabase/actions/scheduler-exams'

type Props = {
  /** Schedule or reschedule this exam's booking. */
  examId?: string
  /** Pre-fill for a fresh booking when no exam is involved (e.g. a consultation for a student). */
  initial?: Partial<BookingFormInput>
  label?: string
  size?: 'sm' | 'default'
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
}

/**
 * Opens the shared booking dialog from anywhere in the app (Exams page, student page).
 * Loads rooms, staff and the pre-fill on click so callers only need an id.
 */
export function ScheduleBookingButton({ examId, initial, label = 'Schedule', size = 'sm', variant = 'outline' }: Props) {
  const router = useRouter()
  const [context, setContext] = useState<BookingDialogContext | null>(null)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const openDialog = () => {
    startTransition(async () => {
      const result = await getBookingDialogContextAction({ examId, initial })
      if (!result.success || !result.data) {
        toast.error(result.error ?? 'Could not open the booking dialog')
        return
      }
      if (!result.data.canWrite) {
        toast.error('You do not have permission to create bookings.')
        return
      }
      setContext(result.data)
      setOpen(true)
    })
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={openDialog} disabled={isPending} className="gap-1">
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarClock className="h-3.5 w-3.5" />}
        {label}
      </Button>
      {context && (
        <BookingDialog
          open={open}
          onOpenChange={setOpen}
          initial={context.initial}
          peopleLabels={context.peopleLabels}
          rooms={context.rooms}
          staff={context.staff}
          currentProfileId={context.currentProfileId}
          canConfirm={context.canConfirm}
          onSaved={() => router.refresh()}
        />
      )}
    </>
  )
}
