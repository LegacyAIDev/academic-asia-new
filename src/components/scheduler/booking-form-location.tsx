'use client'

import { useEffect, useState } from 'react'
import { useWatch } from 'react-hook-form'
import { useDebouncedCallback } from 'use-debounce'
import { Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { EXAM_BOOKING_TYPES } from '@/lib/scheduler/config'
import { findAvailableRooms } from '@/lib/supabase/actions/scheduler-availability'
import type { AvailableRoom } from '@/lib/supabase/queries/scheduler-availability'
import { RoomChip } from './room-chip'
import type { BookingForm, RoomOption } from './booking-dialog'

/** A booking is either in a physical room (with live recommendations) or online. */
export function BookingFormLocation({
  form,
  rooms,
  excludeBookingId,
}: {
  form: BookingForm
  rooms: RoomOption[]
  excludeBookingId: string | null
}) {
  const locationType = useWatch({ control: form.control, name: 'location_type' })
  const roomId = useWatch({ control: form.control, name: 'room_id' })
  const startAt = useWatch({ control: form.control, name: 'start_at' })
  const endAt = useWatch({ control: form.control, name: 'end_at' })
  const seatsRequired = useWatch({ control: form.control, name: 'seats_required' }) ?? 1
  const bookingType = useWatch({ control: form.control, name: 'booking_type' })
  const isExclusive = useWatch({ control: form.control, name: 'is_exclusive' }) ?? false

  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([])
  const examOnly = (EXAM_BOOKING_TYPES as string[]).includes(bookingType)

  const search = useDebouncedCallback(async () => {
    if (locationType !== 'room' || !startAt || !endAt) return
    const result = await findAvailableRooms({
      from: startAt,
      to: endAt,
      seats: seatsRequired,
      examOnly,
      excludeBookingId,
    })
    if (result.success) setAvailableRooms(result.data ?? [])
  }, 400)

  useEffect(() => {
    search()
  }, [locationType, startAt, endAt, seatsRequired, examOnly, excludeBookingId, search])

  const selectRoom = (id: string) => form.setValue('room_id', id, { shouldValidate: true })
  const selectedFallback = rooms.find(r => r.id === roomId)
  const selectedInResults = availableRooms.find(r => r.room_id === roomId)

  return (
    <div className="space-y-3">
      <RadioGroup
        value={locationType}
        onValueChange={v => {
          form.setValue('location_type', v as 'room' | 'online', { shouldValidate: true })
          if (v === 'online') form.setValue('room_id', null, { shouldValidate: true })
          else form.setValue('online_link', null, { shouldValidate: true })
        }}
        className="flex gap-6"
      >
        <div className="flex min-h-9 items-center gap-2">
          <RadioGroupItem value="room" id="location-room" />
          <Label htmlFor="location-room" className="font-normal">In a room</Label>
        </div>
        <div className="flex min-h-9 items-center gap-2">
          <RadioGroupItem value="online" id="location-online" />
          <Label htmlFor="location-online" className="font-normal">Online</Label>
        </div>
      </RadioGroup>

      {locationType === 'online' ? (
        <div className="space-y-1.5">
          <Label htmlFor="online-link" className="text-xs font-medium text-muted-foreground">Meeting link</Label>
          <Input id="online-link" {...form.register('online_link')} placeholder="https://..." />
          {form.formState.errors.online_link && (
            <p className="text-sm text-destructive">{form.formState.errors.online_link.message}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex min-h-9 items-center gap-2">
            <Checkbox
              id="is-exclusive"
              checked={isExclusive}
              onCheckedChange={v => form.setValue('is_exclusive', Boolean(v))}
            />
            <Label htmlFor="is-exclusive" className="font-normal text-sm">Reserve this room exclusively</Label>
          </div>

          {selectedFallback && !selectedInResults && (
            <div className="flex items-center justify-between gap-2 rounded-md border border-primary bg-primary/5 px-3 py-2 text-sm">
              <RoomChip display_name={selectedFallback.display_name} floor={selectedFallback.floor} room_number={selectedFallback.room_number} size="sm" />
              <span className="text-xs text-muted-foreground tabular-nums">{selectedFallback.capacity} seats · kept from the booking</span>
            </div>
          )}

          <div className="max-h-52 space-y-1.5 overflow-y-auto pr-0.5" role="listbox" aria-label="Available rooms">
            {availableRooms.length === 0 && (
              <p className="py-2 text-sm text-muted-foreground">No rooms free for this time and seat count. Try another time or fewer seats.</p>
            )}
            {availableRooms.map(room => {
              const selected = room.room_id === roomId
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  key={room.room_id}
                  onClick={() => selectRoom(room.room_id)}
                  className={cn(
                    'flex w-full min-h-11 items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
                    selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                    <RoomChip
                      display_name={room.display_name}
                      floor={room.floor}
                      room_number={room.room_number}
                      capacity={room.capacity}
                      remaining={room.remaining}
                      size="sm"
                    />
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="hidden text-[11px] text-muted-foreground sm:inline">{room.location_name}</span>
                    {room.is_exam_suitable && <Badge variant="outline" className="text-[11px]">Exam suitable</Badge>}
                  </span>
                </button>
              )
            })}
          </div>
          {form.formState.errors.room_id && (
            <p className="text-sm text-destructive">{form.formState.errors.room_id.message}</p>
          )}
        </div>
      )}
    </div>
  )
}
