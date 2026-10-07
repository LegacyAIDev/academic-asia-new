'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { BookingForm } from './booking-dialog'

/** Required note when an existing booking's time or room changes; sits under the time fields it explains. */
export function BookingFormReason({ form, show }: { form: BookingForm; show: boolean }) {
  if (!show) return null

  return (
    <div className="space-y-1.5 border-l-2 border-primary pl-3">
      <Label htmlFor="booking-reason" className="text-xs font-medium text-muted-foreground">
        Reason for the change <span aria-hidden>*</span>
      </Label>
      <Textarea id="booking-reason" rows={2} {...form.register('reason')} placeholder="Why is the time or room changing?" />
      {form.formState.errors.reason && (
        <p className="text-sm text-destructive">{form.formState.errors.reason.message}</p>
      )}
    </div>
  )
}
