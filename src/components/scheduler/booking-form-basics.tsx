'use client'

import { useWatch } from 'react-hook-form'
import { differenceInMinutes } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BOOKING_TYPES, BOOKING_TYPE_LABELS, TIMEZONE_LABEL } from '@/lib/scheduler/config'
import { buildTimeOptions, fromHkParts, toHkParts } from '@/lib/scheduler/time-utils'
import { BookingStatusBadge } from './booking-status-badge'
import type { BookingForm } from './booking-dialog'

const TIME_OPTIONS = buildTimeOptions('07:00', '22:00', 15)

/** Type, title, HK date + start/end time (15-minute steps) and a status badge when editing. */
export function BookingFormBasics({ form, isEditing }: { form: BookingForm; isEditing: boolean }) {
  const bookingType = useWatch({ control: form.control, name: 'booking_type' })
  const status = useWatch({ control: form.control, name: 'status' })
  const startAt = useWatch({ control: form.control, name: 'start_at' })
  const endAt = useWatch({ control: form.control, name: 'end_at' })

  const hkStart = toHkParts(startAt)
  const hkEnd = toHkParts(endAt)
  const durationMinutes = Math.max(differenceInMinutes(new Date(endAt), new Date(startAt)), 15)

  const applyDate = (date: Date | undefined) => {
    if (!date) return
    form.setValue('start_at', fromHkParts(date, hkStart.time), { shouldValidate: true })
    form.setValue('end_at', fromHkParts(date, hkEnd.time), { shouldValidate: true })
  }

  const applyStartTime = (time: string) => {
    const nextStart = fromHkParts(hkStart.date, time)
    const nextEnd = new Date(new Date(nextStart).getTime() + durationMinutes * 60000)
    form.setValue('start_at', nextStart, { shouldValidate: true })
    form.setValue('end_at', fromHkParts(hkStart.date, `${String(nextEnd.getHours()).padStart(2, '0')}:${String(nextEnd.getMinutes()).padStart(2, '0')}`), { shouldValidate: true })
  }

  const applyEndTime = (time: string) => {
    form.setValue('end_at', fromHkParts(hkEnd.date, time), { shouldValidate: true })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Type</Label>
            <Select
              value={bookingType}
              onValueChange={v => form.setValue('booking_type', v as typeof bookingType, { shouldValidate: true })}
              disabled={isEditing}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOOKING_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{BOOKING_TYPE_LABELS[type]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Title</Label>
            <Input {...form.register('title')} placeholder="e.g. Maths mock exam" />
          </div>
        </div>
        {status && (
          <BookingStatusBadge status={status} className="mt-5" />
        )}
      </div>
      {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {hkStart.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={hkStart.date} defaultMonth={hkStart.date} onSelect={applyDate} />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Start ({TIMEZONE_LABEL})</Label>
          <Select value={hkStart.time} onValueChange={applyStartTime}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-64">
              {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">End ({TIMEZONE_LABEL})</Label>
          <Select value={hkEnd.time} onValueChange={applyEndTime}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-64">
              {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {form.formState.errors.end_at && <p className="text-sm text-destructive">{form.formState.errors.end_at.message}</p>}
    </div>
  )
}
