'use client'

import { useTransition } from 'react'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, MapPin, User, X, Loader2, UserPlus, GripVertical, CalendarX } from 'lucide-react'
import { toast } from 'sonner'
import type { SchedulerRepresentative, SchedulerSchedule, UnassignedStudent } from '@/lib/supabase/queries/event-scheduler'
import { assignStudentToSlot } from '@/lib/supabase/actions/event-scheduler'
import { removeStudentFromSlot } from '@/lib/supabase/actions/event-scheduler'
import { generateTimeSlots, formatSlotTime } from './time-slot-utils'
import { AssignStudentPopover } from './assign-student-popover'
import type { DragData, DropData } from './event-scheduler'

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

  const filledCount = schedules.length
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
            const isOccupied = !!schedule

            if (isOccupied) {
              return (
                <OccupiedSlot
                  key={slot.key}
                  slot={slot}
                  schedule={schedule}
                  repId={representative.id}
                  scheduleDate={scheduleDate}
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

/** Occupied slot -- shows student name, draggable for rescheduling */
function OccupiedSlot({ slot, schedule, repId, scheduleDate, onRemove, isPending }: {
  slot: { start: string; end: string; key: string }
  schedule: SchedulerSchedule
  repId: string
  scheduleDate: string
  onRemove: (id: string) => void
  isPending: boolean
}) {
  const studentName = `${schedule.student?.first_name ?? ''} ${schedule.student?.surname ?? ''}`.trim()

  const dragData: DragData = {
    type: 'scheduled',
    studentId: schedule.student_id,
    studentName,
    scheduleId: schedule.id,
  }

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `schedule-${schedule.id}`,
    data: dragData,
  })

  return (
    <div
      ref={setNodeRef}
      className={`group flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-all duration-150 ${
        isDragging
          ? 'border-primary/20 opacity-40'
          : 'hover:border-border hover:shadow-sm'
      }`}
    >
      <button
        type="button"
        className="shrink-0 cursor-grab touch-none text-muted-foreground/30 transition-colors hover:text-muted-foreground active:cursor-grabbing"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="w-[6.5rem] shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
        {formatSlotTime(slot.start)} -- {formatSlotTime(slot.end)}
      </div>
      <div className="h-8 w-0.5 rounded-full bg-primary/30" />
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium">
          {schedule.student?.first_name} {schedule.student?.surname}
        </span>
        {schedule.student?.student_code && (
          <code className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {schedule.student.student_code}
          </code>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground/40 opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
        onClick={() => onRemove(schedule.id)}
        disabled={isPending}
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
      </Button>
    </div>
  )
}

/** Empty slot -- droppable target for drag-and-drop */
function EmptySlot({ slot, repId, scheduleDate, selectedStudentId, unassigned, onQuickAssign, onPopoverAssign, isPending }: {
  slot: { start: string; end: string; key: string }
  repId: string
  scheduleDate: string
  selectedStudentId: string | null
  unassigned: UnassignedStudent[]
  onQuickAssign: () => void
  onPopoverAssign: (studentId: string) => void
  isPending: boolean
}) {
  const dropData: DropData = { repId, date: scheduleDate, start: slot.start, end: slot.end }

  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slot.key}`,
    data: dropData,
  })

  return (
    <div
      ref={setNodeRef}
      className={`group flex items-center gap-3 rounded-lg border border-dashed px-4 py-3 transition-all duration-150 ${
        isOver
          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/20'
          : selectedStudentId
            ? 'cursor-pointer border-primary/30 bg-primary/[0.03] hover:border-primary/50 hover:bg-primary/[0.07]'
            : 'border-muted-foreground/15 hover:border-muted-foreground/25 hover:bg-muted/40'
      }`}
      onClick={() => selectedStudentId && onQuickAssign()}
    >
      <div className="w-[6.5rem] shrink-0 font-mono text-sm tabular-nums text-muted-foreground/60">
        {formatSlotTime(slot.start)} -- {formatSlotTime(slot.end)}
      </div>
      <div className="h-8 w-0.5 rounded-full bg-muted-foreground/10" />
      <div className="min-w-0 flex-1 text-sm">
        {isOver ? (
          <span className="flex items-center gap-1.5 font-medium text-primary">
            <UserPlus className="h-3.5 w-3.5" />
            Drop to assign
          </span>
        ) : selectedStudentId ? (
          <span className="flex items-center gap-1.5 text-primary/70">
            <UserPlus className="h-3.5 w-3.5" />
            Click to assign
          </span>
        ) : (
          <span className="text-muted-foreground/40">Available</span>
        )}
      </div>
      {!selectedStudentId && !isOver && unassigned.length > 0 && (
        <AssignStudentPopover
          students={unassigned}
          onAssign={onPopoverAssign}
          disabled={isPending}
        />
      )}
    </div>
  )
}
