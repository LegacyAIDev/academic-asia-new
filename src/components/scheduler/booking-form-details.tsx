'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EXAM_BOOKING_TYPES, type BookingType } from '@/lib/scheduler/config'
import type { BookingForm } from './booking-dialog'

/** Assessment snapshot (for exam types), notes and instructions. */
export function BookingFormDetails({ form, bookingType }: { form: BookingForm; bookingType: BookingType }) {
  const isExamType = (EXAM_BOOKING_TYPES as string[]).includes(bookingType)

  return (
    <div className="space-y-4">
      {isExamType && (
        <div className="grid grid-cols-3 gap-3 rounded-lg border border-border p-3">
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Assessment</Label>
            <Input {...form.register('assessment_snapshot.label')} placeholder="e.g. Maths Entrance Test" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Version</Label>
            <Input {...form.register('assessment_snapshot.version')} placeholder="e.g. 2026 A" />
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Assessment notes</Label>
            <Textarea rows={2} {...form.register('assessment_snapshot.notes')} placeholder="Materials, format..." />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
        <Textarea rows={2} {...form.register('notes')} placeholder="Purpose or context for this booking" />
        {form.formState.errors.notes && <p className="text-sm text-destructive">{form.formState.errors.notes.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Instructions</Label>
        <Textarea rows={2} {...form.register('instructions')} placeholder="Anything attendees need to know" />
      </div>
    </div>
  )
}
