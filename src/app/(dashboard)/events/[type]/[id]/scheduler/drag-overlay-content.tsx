'use client'

import { GripVertical, User } from 'lucide-react'

type DragOverlayContentProps = {
  name: string
}

/** Visual card shown while dragging a student -- elevated with shadow for depth */
export function DragOverlayContent({ name }: DragOverlayContentProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-primary/20 bg-card px-4 py-2.5 shadow-xl ring-1 ring-primary/10">
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-primary/15 to-primary/5">
        <User className="h-3 w-3 text-primary" />
      </div>
      <span className="text-sm font-medium">{name}</span>
    </div>
  )
}
