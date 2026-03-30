'use client'

import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, UserPlus, Clock, GripVertical, CheckCircle2, Ban } from 'lucide-react'
import type { UnassignedStudent } from '@/lib/supabase/queries/event-scheduler'
import type { DragData } from './event-scheduler'

type UnassignedSidebarProps = {
  students: UnassignedStudent[]
  selectedStudentId: string | null
  onSelectStudent: (studentId: string | null) => void
}

/** Sidebar listing students who have event applications but no scheduled slot */
export function UnassignedSidebar({
  students, selectedStudentId, onSelectStudent,
}: UnassignedSidebarProps) {
  const [search, setSearch] = useState('')

  const filtered = students.filter(s => {
    if (!search) return true
    const name = `${s.first_name ?? ''} ${s.surname ?? ''} ${s.student_code ?? ''}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <span className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-primary/15 to-primary/5">
              <UserPlus className="h-3.5 w-3.5 text-primary" />
            </div>
            Unassigned
          </span>
          <Badge variant="secondary" className="tabular-nums text-xs">
            {students.length}
          </Badge>
        </CardTitle>
        <div className="relative mt-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 pl-8 text-sm"
          />
        </div>
      </CardHeader>
      <CardContent className="max-h-[calc(100vh-340px)] overflow-y-auto px-3 pb-3">
        <DraggableBlocker />
        <div className="my-2 border-t border-border/50" />
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            {students.length === 0 ? (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">All scheduled</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Every student has a slot</p>
              </>
            ) : (
              <>
                <Search className="h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-xs text-muted-foreground">No matching students</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map(student => (
              <DraggableStudent
                key={student.student_id}
                student={student}
                isSelected={selectedStudentId === student.student_id}
                onSelect={() => onSelectStudent(
                  selectedStudentId === student.student_id ? null : student.student_id
                )}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** Draggable blocker item for blocking time slots */
function DraggableBlocker() {
  const dragData: DragData = {
    type: 'blocker',
    studentName: 'Blocker',
  }

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: 'blocker-item',
    data: dragData,
  })

  return (
    <div
      ref={setNodeRef}
      className={`group flex items-center gap-1 rounded-lg border transition-all duration-150 ${
        isDragging
          ? 'border-rose-300/30 bg-rose-50/50 opacity-40'
          : 'border-transparent hover:border-rose-200 hover:bg-rose-50/50'
      }`}
    >
      <button
        type="button"
        className="shrink-0 cursor-grab touch-none p-2 text-rose-400/50 transition-colors hover:text-rose-500 active:cursor-grabbing"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-center gap-2 px-1 py-2.5">
        <Ban className="h-3.5 w-3.5 text-rose-500" />
        <span className="text-sm font-medium text-rose-600">Block Slot</span>
        <span className="text-xs text-muted-foreground">(drag to grid)</span>
      </div>
    </div>
  )
}

/** Individual draggable student card */
function DraggableStudent({ student, isSelected, onSelect }: {
  student: UnassignedStudent
  isSelected: boolean
  onSelect: () => void
}) {
  const dragData: DragData = {
    type: 'unassigned',
    studentId: student.student_id,
    studentName: `${student.first_name ?? ''} ${student.surname ?? ''}`.trim(),
  }

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `student-${student.student_id}`,
    data: dragData,
  })

  return (
    <div
      ref={setNodeRef}
      className={`group flex items-center gap-1 rounded-lg border transition-all duration-150 ${
        isDragging
          ? 'border-primary/20 bg-primary/5 opacity-40'
          : isSelected
            ? 'border-primary/30 bg-primary/5 shadow-sm'
            : 'border-transparent hover:border-border hover:bg-muted/60'
      }`}
    >
      <button
        type="button"
        className="shrink-0 cursor-grab touch-none p-2 text-muted-foreground/30 transition-colors hover:text-muted-foreground active:cursor-grabbing"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 px-1 py-2.5 text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">
            {student.first_name} {student.surname}
          </span>
          {student.student_code && (
            <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {student.student_code}
            </code>
          )}
        </div>
        {student.preferred_time && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Preferred: {student.preferred_time}
          </div>
        )}
      </button>
    </div>
  )
}
