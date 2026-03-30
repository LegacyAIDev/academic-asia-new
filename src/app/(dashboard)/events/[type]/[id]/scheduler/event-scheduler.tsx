'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, Users, CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { DndContext, DragOverlay, closestCenter, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { toast } from 'sonner'
import type {
  SchedulerEvent, SchedulerRepresentative, SchedulerSchedule, UnassignedStudent,
} from '@/lib/supabase/queries/event-scheduler'
import { assignStudentToSlot, moveStudentSlot, createBlocker } from '@/lib/supabase/actions/event-scheduler'
import { RepresentativeTabs } from './representative-tabs'
import { TimeSlotGrid } from './time-slot-grid'
import { UnassignedSidebar } from './unassigned-sidebar'
import { DragOverlayContent } from './drag-overlay-content'

type EventSchedulerProps = {
  event: SchedulerEvent
  representatives: SchedulerRepresentative[]
  schedules: SchedulerSchedule[]
  unassigned: UnassignedStudent[]
  eventType: string
}

/** Drag data attached to draggable items */
export type DragData = {
  type: 'unassigned' | 'scheduled' | 'blocker'
  studentId?: string
  studentName: string
  scheduleId?: string
}

/** Drop data attached to droppable time slots */
export type DropData = {
  repId: string
  date: string
  start: string
  end: string
}

/** Main scheduler component — orchestrates rep selection, time grid, student sidebar, and drag-drop */
export function EventScheduler({
  event, representatives, schedules, unassigned, eventType,
}: EventSchedulerProps) {
  const [selectedRepId, setSelectedRepId] = useState<string>(
    representatives[0]?.id ?? ''
  )
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null)
  const [, startTransition] = useTransition()

  // Date navigation for multi-day events
  const startDate = event.start_date ?? new Date().toISOString().split('T')[0]
  const endDate = event.end_date ?? startDate
  const [selectedDate, setSelectedDate] = useState(startDate)

  const hasPrevDay = selectedDate > startDate
  const hasNextDay = selectedDate < endDate

  const navigateDay = (direction: -1 | 1) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + direction)
    const newDate = d.toISOString().split('T')[0]
    if (newDate >= startDate && newDate <= endDate) setSelectedDate(newDate)
  }

  const selectedRep = representatives.find(r => r.id === selectedRepId)
  const repSchedules = schedules.filter(
    s => s.representative_id === selectedRepId && s.schedule_date === selectedDate
  )
  const slotMinutes = selectedRep?.slot_length_minutes ?? event.duration_minutes ?? 30
  const scheduledCount = schedules.filter(s => !s.is_blocker).length
  const totalApplicants = scheduledCount + unassigned.length
  const isMultiDay = startDate !== endDate

  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as DragData | undefined
    if (data) setActiveDrag(data)
  }

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDrag(null)
    const dragData = e.active.data.current as DragData | undefined
    const dropData = e.over?.data.current as DropData | undefined
    if (!dragData || !dropData) return

    if (dragData.type === 'blocker') {
      startTransition(async () => {
        const result = await createBlocker({
          event_id: event.id,
          representative_id: dropData.repId,
          schedule_date: dropData.date,
          start_time: dropData.start,
          end_time: dropData.end,
        })
        if (result.success) {
          toast.success('Slot blocked')
        } else {
          toast.error(result.error ?? 'Failed to block slot')
        }
      })
    } else if (dragData.type === 'unassigned' && dragData.studentId) {
      startTransition(async () => {
        const result = await assignStudentToSlot({
          event_id: event.id,
          student_id: dragData.studentId!,
          representative_id: dropData.repId,
          schedule_date: dropData.date,
          start_time: dropData.start,
          end_time: dropData.end,
        })
        if (result.success) {
          toast.success(`Assigned ${dragData.studentName}`)
        } else {
          toast.error(result.error ?? 'Failed to assign')
        }
      })
    } else if (dragData.type === 'scheduled' && dragData.scheduleId) {
      startTransition(async () => {
        const result = await moveStudentSlot(dragData.scheduleId!, event.id, {
          representative_id: dropData.repId,
          schedule_date: dropData.date,
          start_time: dropData.start,
          end_time: dropData.end,
        })
        if (result.success) {
          toast.success(`Moved ${dragData.studentName}`)
        } else {
          toast.error(result.error ?? 'Failed to move')
        }
      })
    }
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link href={`/events/${eventType}/${event.id}`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm">
              <CalendarClock className="h-5.5 w-5.5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{event.name}</h1>
              <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {scheduledCount}/{totalApplicants} scheduled
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Date navigation for multi-day events */}
        {isMultiDay && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={!hasPrevDay}
              onClick={() => navigateDay(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1.5 rounded-lg border bg-muted/50 px-4 py-1.5 text-sm font-medium tabular-nums">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={!hasNextDay}
              onClick={() => navigateDay(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Representative selector */}
        {representatives.length > 0 ? (
          <>
            <RepresentativeTabs
              representatives={representatives}
              selectedRepId={selectedRepId}
              onSelect={setSelectedRepId}
              schedules={schedules}
            />

            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
              <UnassignedSidebar
                students={unassigned}
                selectedStudentId={selectedStudentId}
                onSelectStudent={setSelectedStudentId}
              />

              <TimeSlotGrid
                eventId={event.id}
                representative={selectedRep!}
                schedules={repSchedules}
                scheduleDate={selectedDate}
                slotMinutes={slotMinutes}
                unassigned={unassigned}
                selectedStudentId={selectedStudentId}
                onStudentAssigned={() => setSelectedStudentId(null)}
              />
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed p-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-muted/80 to-muted/40">
              <Users className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <h3 className="mt-5 text-lg font-semibold tracking-tight">No Representatives</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Add representatives to this event before scheduling sessions.
            </p>
            <Button variant="outline" className="mt-5 shadow-sm" asChild>
              <Link href={`/events/${eventType}/${event.id}/edit`}>Edit Event</Link>
            </Button>
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDrag && <DragOverlayContent name={activeDrag.studentName} isBlocker={activeDrag.type === 'blocker'} />}
      </DragOverlay>
    </DndContext>
  )
}
