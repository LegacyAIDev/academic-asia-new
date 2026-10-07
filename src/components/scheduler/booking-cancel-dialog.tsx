'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cancelReasonSchema } from '@/lib/scheduler/booking-schema'
import { cancelBooking } from '@/lib/supabase/actions/scheduler-bookings'

/** Reason dialog for cancelling a booking; a confirmed exam becomes cancelled too. */
export function BookingCancelDialog({
  bookingId,
  open,
  onOpenChange,
  onCancelled,
}: {
  bookingId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCancelled: () => void
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    const parsed = cancelReasonSchema.safeParse({ reason })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please give a reason')
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await cancelBooking(bookingId, parsed.data)
      if (result.success) {
        toast.success('Booking cancelled')
        setReason('')
        onOpenChange(false)
        onCancelled()
      } else {
        setError(result.error ?? 'Failed to cancel booking')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancel booking</DialogTitle>
          <DialogDescription>
            This releases the room and notifies attendees. A confirmed exam linked to this booking is cancelled too.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Reason *</Label>
          <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this booking being cancelled?" />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Keep booking
          </Button>
          <Button type="button" variant="destructive" onClick={handleSubmit} disabled={isPending} className="gap-2">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Cancel booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
