"use client"

import { Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { PRIORITY_LABELS, dueLabel, dueStatus, type StaffTask } from "@/lib/tasks/task-rules"
import { cn } from "@/lib/utils"

type Props = {
  task: StaffTask
  today: string
  busy: boolean
  onToggle: () => void
  onEdit?: () => void
  onDelete: () => void
}

const PRIORITY_STYLE = {
  high: "border-destructive/40 text-destructive",
  medium: "",
  low: "text-muted-foreground",
} as const

/** One task: tick it off, see its priority and deadline, edit or delete it. */
export function TaskRow({ task, today, busy, onToggle, onEdit, onDelete }: Props) {
  const done = !!task.completedAt
  const status = done ? "none" : dueStatus(task.dueDate, today)
  return (
    <li className="flex items-start gap-3 border-t py-3 first:border-t-0" data-task-id={task.id}>
      <Checkbox
        className="mt-0.5"
        checked={done}
        disabled={busy}
        onCheckedChange={onToggle}
        aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium break-words", done && "text-muted-foreground line-through")}>{task.title}</p>
        {task.notes && <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">{task.notes}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className={cn("h-5 px-1.5", PRIORITY_STYLE[task.priority])}>{PRIORITY_LABELS[task.priority]}</Badge>
          {!done && task.dueDate && (
            <span className={cn(
              status === "overdue" && "font-medium text-destructive",
              status === "today" && "font-medium text-amber-600",
              (status === "soon" || status === "later") && "text-muted-foreground",
            )}>
              {dueLabel(task.dueDate, today)}
            </span>
          )}
        </div>
      </div>
      {onEdit && (
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={busy} onClick={onEdit} aria-label={`Edit "${task.title}"`}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={busy} onClick={onDelete} aria-label={`Delete "${task.title}"`}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  )
}
