"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { StaffTask, TaskPriority } from "@/lib/tasks/task-rules"
import { updateTask } from "@/lib/supabase/actions/staff-tasks"
import { DeadlineInput, PrioritySelect } from "./task-fields"

type Props = { task: StaffTask; onClose: () => void; onSaved: (task: StaffTask) => void }

/** Changes a task's wording, notes, priority or deadline, in a side drawer. */
export function TaskEditDialog({ task, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes ?? "")
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [dueDate, setDueDate] = useState(task.dueDate ?? "")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const result = await updateTask(task.id, { title, notes, priority, dueDate })
      if (result.success && result.data) onSaved(result.data)
      else setError(result.error ?? "Could not save the task")
    } catch {
      setError("Could not save the task")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open onOpenChange={next => { if (!next && !saving) onClose() }}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="sticky top-0 z-20 border-b bg-background px-6 py-4">
          <SheetTitle>Edit task</SheetTitle>
          <SheetDescription>Change what the task says, how urgent it is, or when it is due.</SheetDescription>
        </SheetHeader>
        <form onSubmit={e => { e.preventDefault(); if (title.trim()) void save() }} className="space-y-4 px-6 pt-5">
          <fieldset disabled={saving} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-edit-title">Task <span className="text-destructive">*</span></Label>
              <Input id="task-edit-title" value={title} maxLength={200} onChange={e => setTitle(e.target.value)}
                aria-invalid={!title.trim() || undefined} className={!title.trim() ? "border-destructive" : undefined} />
              {!title.trim() && <p className="text-sm text-destructive">Write what the task is.</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-edit-notes">Notes</Label>
              <Textarea id="task-edit-notes" rows={4} maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="task-edit-priority">Priority</Label>
                <PrioritySelect id="task-edit-priority" value={priority} onChange={setPriority} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="task-edit-due">Due</Label>
                <DeadlineInput id="task-edit-due" value={dueDate} onChange={setDueDate} />
              </div>
            </div>
          </fieldset>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <div className="sticky bottom-0 z-10 -mx-6 flex items-center justify-end gap-2 border-t bg-background px-6 py-3">
            <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !title.trim()} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}Save task
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
