"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PRIORITY_LABELS, TASK_PRIORITIES, type TaskPriority } from "@/lib/tasks/task-rules"

/** Priority choice, shared by the quick-add row and the edit dialog. */
export function PrioritySelect({ id, value, onChange }: { id: string; value: TaskPriority; onChange: (p: TaskPriority) => void }) {
  return (
    <Select value={value} onValueChange={v => onChange(v as TaskPriority)}>
      <SelectTrigger id={id} className="w-40" aria-label="Priority"><SelectValue /></SelectTrigger>
      <SelectContent>
        {TASK_PRIORITIES.map(p => <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]} priority</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

/** Deadline as a calendar day; empty means no deadline. */
export function DeadlineInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return <Input id={id} type="date" value={value} onChange={e => onChange(e.target.value)} className="w-44" aria-label="Deadline" />
}
