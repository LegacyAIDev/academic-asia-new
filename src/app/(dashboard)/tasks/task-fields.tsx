"use client"

import { DateField } from "@/components/ui/date-field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PRIORITY_LABELS, TASK_PRIORITIES, type TaskPriority } from "@/lib/tasks/task-rules"

/** Priority choice, shared by the quick-add row and the edit drawer. */
export function PrioritySelect({ id, value, onChange }: { id: string; value: TaskPriority; onChange: (p: TaskPriority) => void }) {
  // Wrapped so the Select's hidden native input does not pick up the label's spacing and lift the box.
  return (
    <div>
      <Select value={value} onValueChange={v => onChange(v as TaskPriority)}>
        <SelectTrigger id={id} className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {TASK_PRIORITIES.map(p => <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]} priority</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

/** Deadline as a calendar day, with the app's date picker; empty means no deadline. */
export function DeadlineInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return <DateField id={id} name={`${id}-value`} value={value || null} onChange={next => onChange(next ?? "")} placeholder="No deadline" className="w-44" />
}
