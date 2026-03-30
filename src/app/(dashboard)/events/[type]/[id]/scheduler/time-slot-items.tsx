'use client'

import { useDroppable, useDraggable } from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { X, Loader2, UserPlus, GripVertical, Ban } from 'lucide-react'
import type { SchedulerSchedule, UnassignedStudent } from '@/lib/supabase/queries/event-scheduler'
import { AssignStudentPopover } from './assign-student-popover'
import { formatSlotTime } from './time-slot-utils'
import type { DragData, DropData } from './event-scheduler'

type SlotShape = { start: string; end: string; key: string }

/** Blocked slot — shows blocker label with remove option */
export function BlockedSlot({ slot, schedule, onRemove, isPending }: {
  slot: SlotShape
  schedule: SchedulerSchedule
  onRemove: (id: string) => void
  isPending: boolean
}) {
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-rose-200/60 bg-rose-50/50 px-4 py-3 transition-all duration-150">
      <div className="w-[6.5rem] shrink-0 font-mono text-sm tabular-nums text-rose-400">
        {formatSlotTime(slot.start)} -- {formatSlotTime(slot.end)}
      </div>
      <div className="h-8 w-0.5 rounded-full bg-rose-300/40" />
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <Ban className="h-3.5 w-3.5 text-rose-400 shrink-0" />
        <span className="text-sm font-medium text-rose-600">
          {schedule.remarks || 'Blocked'}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-rose-300 opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
        onClick={() => onRemove(schedule.id)}
        disabled={isPending}
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
      </Button>
    </div>
  )
}

/** Occupied slot — shows student name, draggable for rescheduling */
export function OccupiedSlot({ slot, schedule, onRemove, isPending }: {
  slot: SlotShape
  schedule: SchedulerSchedule
  onRemove: (id: string) => void
  isPending: boolean
}) {
  const studentName = `${schedule.student?.first_name ?? ''} ${schedule.student?.surname ?? ''}`.trim()

  const dragData: DragData = {
    type: 'scheduled',
    studentId: schedule.student_id ?? undefined,
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

/** Empty slot — droppable target for drag-and-drop */
export function EmptySlot({ slot, repId, scheduleDate, selectedStudentId, unassigned, onQuickAssign, onPopoverAssign, isPending }: {
  slot: SlotShape
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
