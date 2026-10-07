'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { bookingFormSchema, type BookingFormInput, type BookingFormValues } from '@/lib/scheduler/booking-schema'
import { defaultBookingInput } from '@/lib/scheduler/booking-defaults'
import { saveBooking, confirmBooking, type SaveBookingResult } from '@/lib/supabase/actions/scheduler-bookings'
import { BookingFormSection } from './booking-form-section'
import { BookingFormBasics } from './booking-form-basics'
import { BookingFormReason } from './booking-form-reason'
import { BookingFormLocation } from './booking-form-location'
import { BookingFormPeople } from './booking-form-people'
import { BookingFormDetails } from './booking-form-details'
import { BookingConflictBanner } from './booking-conflict-banner'
import { BookingCancelDialog } from './booking-cancel-dialog'
import { useBookingConflicts } from './use-booking-conflicts'

export type RoomOption = {
  id: string
  display_name: string
  floor: string | null
  room_number: string | null
  capacity: number
  is_exam_suitable: boolean
  is_active: boolean
}

export type StaffOption = { id: string; first_name: string | null; surname: string | null }

export type BookingDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Partial<BookingFormInput>
  peopleLabels?: Record<string, string>
  rooms: RoomOption[]
  staff: StaffOption[]
  currentProfileId: string
  canConfirm: boolean
  onSaved?: (id: string) => void
}

/** Form instance shared with every section component. */
export type BookingForm = UseFormReturn<BookingFormInput, unknown, BookingFormValues>

/** Create/edit dialog for the six spec booking types (rules and calendar DnD live elsewhere). */
export function BookingDialog({
  open,
  onOpenChange,
  initial,
  peopleLabels = {},
  rooms,
  staff,
  currentProfileId,
  canConfirm,
  onSaved,
}: BookingDialogProps) {
  const isEditing = Boolean(initial?.id)
  const [isPending, startTransition] = useTransition()
  const [cancelOpen, setCancelOpen] = useState(false)

  const defaultValues = useMemo(
    () => defaultBookingInput(initial ?? {}, currentProfileId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  )

  const form: BookingForm = useForm<BookingFormInput, unknown, BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      form.reset(defaultValues)
      setConflicts(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultValues])

  const startAt = useWatch({ control: form.control, name: 'start_at' })
  const endAt = useWatch({ control: form.control, name: 'end_at' })
  const { conflicts, setConflicts } = useBookingConflicts(form, initial?.id ?? null)

  const original = isEditing ? defaultValues : null
  const timeOrRoomChanged =
    original !== null &&
    (original.start_at !== startAt || original.end_at !== endAt || original.room_id !== form.getValues('room_id'))

  const onSubmit = (values: BookingFormValues) => {
    startTransition(async () => {
      const result: SaveBookingResult = await saveBooking(values)
      if (result.success) {
        toast.success(isEditing ? 'Booking updated' : 'Booking created')
        onOpenChange(false)
        if (result.data?.id) onSaved?.(result.data.id)
        return
      }
      if (result.error === 'CONFLICT' && result.data?.conflicts) {
        setConflicts(result.data.conflicts)
        toast.warning('Some attendees are already busy for this time.')
        return
      }
      toast.error(result.error ?? 'Failed to save booking')
    })
  }

  const handleConfirm = () => {
    if (!initial?.id) return
    startTransition(async () => {
      const result = await confirmBooking(initial.id!)
      if (result.success) {
        toast.success('Booking confirmed')
        onOpenChange(false)
        onSaved?.(initial.id!)
      } else {
        toast.error(result.error ?? 'Failed to confirm booking')
      }
    })
  }

  const showConfirm = isEditing && canConfirm && initial?.status === 'pending'
  const bookingType = useWatch({ control: form.control, name: 'booking_type' })

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit booking' : 'New booking'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <BookingFormSection title="When">
              <BookingFormBasics form={form} isEditing={isEditing} />
              <BookingFormReason form={form} show={timeOrRoomChanged} />
            </BookingFormSection>
            <BookingFormSection title="Where">
              <BookingFormLocation form={form} rooms={rooms} excludeBookingId={initial?.id ?? null} />
            </BookingFormSection>
            <BookingFormSection title="Who">
              <BookingFormPeople form={form} staff={staff} peopleLabels={peopleLabels} />
            </BookingFormSection>
            <BookingFormSection title="Details">
              <BookingFormDetails form={form} bookingType={bookingType} />
            </BookingFormSection>

            <BookingConflictBanner conflicts={conflicts} form={form} />

            <DialogFooter className="gap-2">
              {isEditing && (
                <Button type="button" variant="outline" className="mr-auto" onClick={() => setCancelOpen(true)} disabled={isPending}>
                  Cancel booking
                </Button>
              )}
              {showConfirm && (
                <Button type="button" variant="secondary" onClick={handleConfirm} disabled={isPending}>
                  Confirm
                </Button>
              )}
              <Button type="submit" disabled={isPending} className="min-w-[110px] gap-2">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isEditing && (
        <BookingCancelDialog
          bookingId={initial!.id!}
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          onCancelled={() => {
            onOpenChange(false)
            onSaved?.(initial!.id!)
          }}
        />
      )}
    </>
  )
}
