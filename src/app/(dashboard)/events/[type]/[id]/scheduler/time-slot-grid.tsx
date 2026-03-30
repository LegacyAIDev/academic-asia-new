'use client'

import { useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, MapPin, User, CalendarX, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import type { SchedulerRepresentative, SchedulerSchedule, UnassignedStudent } from '@/lib/supabase/queries/event-scheduler'
import { assignStudentToSlot, removeStudentFromSlot } from '@/lib/supabase/actions/event-scheduler'
import { generateTimeSlots, formatSlotTime } from './time-slot-utils'
import { BlockedSlot, OccupiedSlot, EmptySlot } from './time-slot-items'

type TimeSlotGridProps = {
  eventId: string
  representative: SchedulerRepresentative
  schedules: SchedulerSchedule[]
  scheduleDate: string
  slotMinutes: number
  unassigned: UnassignedStudent[]
  selectedStudentId: string | null
  onStudentAssigned: () => void
}

/** Renders the time slot grid for a single representative */
export function TimeSlotGrid({
  eventId, representative, schedules, scheduleDate,
  slotMinutes, unassigned, selectedStudentId, onStudentAssigned,
}: TimeSlotGridProps) {
  const [isPending, startTransition] = useTransition()

  if (!representative.available_from || !representative.available_to) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-muted/80 to-muted/40">
            <Clock className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">No availability set</p>
          <p className="mt-1 max-w-[280px] text-sm text-muted-foreground">
            Edit the event to set available times for this representative.
          </p>
        </CardContent>
      </Card>
    )
  }

  const timeSlots = generateTimeSlots(
    representative.available_from,
    representative.available_to,
    slotMinutes,
    representative.id
  )

  const scheduleByTime: Record<string, SchedulerSchedule> = {}
  schedules.forEach(s => {
    if (s.start_time) {
      const key = s.start_time.slice(0, 5)
      scheduleByTime[key] = s
    }
  })

  const handleQuickAssign = (slot: { start: string; end: string }) => {
    if (!selectedStudentId) return
    startTransition(async () => {
      const result = await assignStudentToSlot({
        event_id: eventId,
        student_id: selectedStudentId,
        representative_id: representative.id,
        schedule_date: scheduleDate,
        start_time: slot.start,
        end_time: slot.end,
      })
      if (result.success) {
        toast.success('Student assigned to slot')
        onStudentAssigned()
      } else {
        toast.error(result.error ?? 'Failed to assign')
      }
    })
  }

  const handleAssignFromPopover = (studentId: string, slot: { start: string; end: string }) => {
    startTransition(async () => {
      const result = await assignStudentToSlot({
        event_id: eventId,
        student_id: studentId,
        representative_id: representative.id,
        schedule_date: scheduleDate,
        start_time: slot.start,
        end_time: slot.end,
      })
      if (result.success) {
        toast.success('Student assigned to slot')
        onStudentAssigned()
      } else {
        toast.error(result.error ?? 'Failed to assign')
      }
    })
  }

  const handleRemove = (scheduleId: string) => {
    startTransition(async () => {
      const result = await removeStudentFromSlot(scheduleId, eventId)
      if (result.success) {
        toast.success('Student removed from slot')
      } else {
        toast.error(result.error ?? 'Failed to remove')
      }
    })
  }

  const filledCount = schedules.filter(s => !s.is_blocker).length
  const totalCount = timeSlots.length
  const fillPercentage = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2.5 text-base font-medium">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="truncate">{representative.name}</span>
              {representative.role && (
                <span className="hidden text-sm font-normal text-muted-foreground sm:inline">
                  -- {representative.role}
                </span>
              )}
            </CardTitle>
            <CardDescription className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                {formatSlotTime(representative.available_from)} -- {formatSlotTime(representative.available_to)}
              </span>
              <span className="tabular-nums">{slotMinutes} min slots</span>
              {representative.venue_room && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" />
                  {representative.venue_room}
                </span>
              )}
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0 tabular-nums">
            {filledCount}/{totalCount} filled
            {fillPercentage > 0 && (
              <span className="ml-1 text-muted-foreground">({fillPercentage}%)</span>
            )}
          </Badge>
        </div>
        {selectedStudentId && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-sm text-primary">
            <UserPlus className="h-4 w-4 shrink-0" />
            Click an empty slot to assign the selected student
          </div>
        )}
      </CardHeader>
      <CardContent className="pb-5">
        <div className="space-y-1.5">
          {timeSlots.map(slot => {
            const schedule = scheduleByTime[slot.start]

            if (schedule?.is_blocker) {
              return (
                <BlockedSlot
                  key={slot.key}
                  slot={slot}
                  schedule={schedule}
                  onRemove={handleRemove}
                  isPending={isPending}
                />
              )
            }

            if (schedule) {
              return (
                <OccupiedSlot
                  key={slot.key}
                  slot={slot}
                  schedule={schedule}
                  onRemove={handleRemove}
                  isPending={isPending}
                />
              )
            }

            return (
              <EmptySlot
                key={slot.key}
                slot={slot}
                repId={representative.id}
                scheduleDate={scheduleDate}
                selectedStudentId={selectedStudentId}
                unassigned={unassigned}
                onQuickAssign={() => handleQuickAssign(slot)}
                onPopoverAssign={(studentId) => handleAssignFromPopover(studentId, slot)}
                isPending={isPending}
              />
            )
          })}
        </div>

        {timeSlots.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-muted/80 to-muted/40">
              <CalendarX className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">No time slots</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check availability times and slot duration.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
