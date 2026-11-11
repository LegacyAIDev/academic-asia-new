'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch, type FieldErrors, type UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { bookingFormSchema, type BookingFormInput, type BookingFormValues } from '@/lib/scheduler/booking-schema'
import { defaultBookingInput } from '@/lib/scheduler/booking-defaults'
import { canCancelBooking } from '@/lib/scheduler/booking-permissions'
import { formErrorMessages } from '@/lib/scheduler/form-error-messages'
import { seatOutsideRoom } from '@/lib/scheduler/error-messages'
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

/** Create/edit side drawer for the six spec booking types (rules and calendar DnD live elsewhere). */
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
  const [problems, setProblems] = useState<string[]>([])

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

  // A listed problem goes away as soon as the form is changed, so it never describes old values.
  useEffect(() => {
    const subscription = form.watch(() => setProblems(current => (current.length ? [] : current)))
    return () => subscription.unsubscribe()
  }, [form])

  const startAt = useWatch({ control: form.control, name: 'start_at' })
  const endAt = useWatch({ control: form.control, name: 'end_at' })
  const { conflicts, setConflicts } = useBookingConflicts(form, initial?.id ?? null)

  const original = isEditing ? defaultValues : null
  const timeOrRoomChanged =
    original !== null &&
    (original.start_at !== startAt || original.end_at !== endAt || original.room_id !== form.getValues('room_id'))

  // Every reason the form will not save, listed beside Save (some rules have no field on screen).
  const onInvalid = (errors: FieldErrors<BookingFormInput>) => setProblems(formErrorMessages(errors))

  const onSubmit = (values: BookingFormValues) => {
    // A seat beyond the room's seats is caught here, keeping what was typed (UAT DEV24-008).
    const capacity = rooms.find(room => room.id === values.room_id)?.capacity
    const outside = capacity ? values.attendees.filter(a => a.seat_no && a.seat_no > capacity) : []
    if (capacity && outside.length > 0) {
      setProblems(outside.map(a => seatOutsideRoom(a.seat_no!, capacity)))
      return
    }
    setProblems([])
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
      setProblems([result.error ?? 'Failed to save booking'])
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
  // The dialog only opens for staff with scheduler edit access; a confirmed exam also needs exam access.
  const showCancel =
    isEditing &&
    canCancelBooking({ canWrite: true, canConfirm, status: initial?.status ?? 'confirmed', bookingType: initial?.booking_type ?? 'other' })
  const bookingType = useWatch({ control: form.control, name: 'booking_type' })

  return (
    <>
      <Sheet open={open} onOpenChange={v => { if (!v) setProblems([]); onOpenChange(v) }}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-2xl">
          <SheetHeader className="sticky top-0 z-20 border-b bg-background px-6 py-4">
            <SheetTitle>{isEditing ? 'Edit booking' : 'New booking'}</SheetTitle>
            <SheetDescription>{isEditing ? 'Change what you need, then save.' : 'Pick a type and a time; the rest can follow.'}</SheetDescription>
          </SheetHeader>

          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-5 px-6 pt-5">
            <BookingFormSection title="What">
              <BookingFormBasics form={form} isEditing={isEditing} part="what" />
            </BookingFormSection>
            <BookingFormSection title="When">
              <BookingFormBasics form={form} isEditing={isEditing} part="when" />
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

            {problems.length > 0 && (
              <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <p className="font-medium">This booking can&apos;t be saved yet:</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {problems.map(p => <li key={p}>{p}</li>)}
                </ul>
              </div>
            )}

            {/* Save stays in view however long the form gets. */}
            <div className="sticky bottom-0 z-10 -mx-6 flex flex-wrap items-center justify-end gap-2 border-t bg-background px-6 py-3">
              {showCancel && (
                <Button type="button" variant="outline" className="mr-auto" onClick={() => setCancelOpen(true)} disabled={isPending}>
                  Cancel booking
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>Close</Button>
              {showConfirm && (
                <Button type="button" variant="secondary" onClick={handleConfirm} disabled={isPending}>
                  Confirm
                </Button>
              )}
              <Button type="submit" disabled={isPending} className="min-w-[110px] gap-2">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

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
