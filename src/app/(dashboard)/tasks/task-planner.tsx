"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { ChevronDown, ChevronRight, Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { dueStatus, sortActiveTasks, sortCompletedTasks, type StaffTask, type TaskPriority } from "@/lib/tasks/task-rules"
import { clearCompletedTasks, createTask, deleteTask, setTaskCompleted } from "@/lib/supabase/actions/staff-tasks"
import { DeadlineInput, PrioritySelect } from "./task-fields"
import { TaskRow } from "./task-row"
import { TaskEditDialog } from "./task-edit-dialog"

type Props = { initialActive: StaffTask[]; initialCompleted: StaffTask[]; today: string }

/**
 * The planner: add a task with a priority and deadline, tick it off, and keep
 * completed tasks out of the active list (meeting note 2). Changes show at
 * once from the saved task the server returns.
 */
export function TaskPlanner({ initialActive, initialCompleted, today }: Props) {
  const [tasks, setTasks] = useState<StaffTask[]>([...initialActive, ...initialCompleted])
  const [title, setTitle] = useState("")
  const [priority, setPriority] = useState<TaskPriority>("medium")
  const [dueDate, setDueDate] = useState("")
  const [adding, setAdding] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editing, setEditing] = useState<StaffTask | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [clearing, setClearing] = useState(false)
  // A deletion waiting for confirmation: one task, or every completed task.
  const [confirming, setConfirming] = useState<{ kind: "task"; task: StaffTask } | { kind: "completed" } | null>(null)

  const active = useMemo(() => sortActiveTasks(tasks.filter(t => !t.completedAt)), [tasks])
  const completed = useMemo(() => sortCompletedTasks(tasks.filter(t => t.completedAt)), [tasks])
  const overdue = active.filter(t => dueStatus(t.dueDate, today) === "overdue").length
  const replace = (task: StaffTask) => setTasks(list => list.map(t => (t.id === task.id ? task : t)))

  const add = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    setAdding(true)
    try {
      const result = await createTask({ title, priority, dueDate })
      if (!result.success || !result.data) return toast.error(result.error ?? "Could not add the task")
      setTasks(list => [...list, result.data!])
      setTitle("")
      setDueDate("")
      setPriority("medium")
    } catch {
      toast.error("Could not add the task")
    } finally {
      setAdding(false)
    }
  }

  const run = async (id: string, action: () => Promise<{ success: boolean; error?: string; data?: StaffTask | void }>, removes = false) => {
    setBusyId(id)
    try {
      const result = await action()
      if (!result.success) return toast.error(result.error ?? "Something went wrong")
      if (removes) setTasks(list => list.filter(t => t.id !== id))
      else if (result.data) replace(result.data)
    } catch {
      toast.error("Something went wrong")
    } finally {
      setBusyId(null)
    }
  }

  const clearCompleted = async () => {
    setClearing(true)
    try {
      const result = await clearCompletedTasks().catch(() => null)
      if (!result?.success) return toast.error(result?.error ?? "Could not clear the completed tasks")
      setTasks(list => list.filter(t => !t.completedAt))
      toast.success("Completed tasks cleared")
    } finally {
      setClearing(false)
    }
  }

  const confirmDeletion = () => {
    const pending = confirming
    setConfirming(null)
    if (pending?.kind === "task") void run(pending.task.id, () => deleteTask(pending.task.id), true)
    else if (pending?.kind === "completed") void clearCompleted()
  }

  const row = (task: StaffTask) => (
    <TaskRow key={task.id} task={task} today={today} busy={busyId === task.id}
      onToggle={() => run(task.id, () => setTaskCompleted(task.id, !task.completedAt))}
      onEdit={task.completedAt ? undefined : () => setEditing(task)}
      onDelete={() => setConfirming({ kind: "task", task })} />
  )

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <form onSubmit={add} className="flex flex-wrap items-center gap-3">
            <Input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} placeholder="Add a task, e.g. Chase Brighton College for the offer letter"
              aria-label="New task" className="min-w-64 flex-1" disabled={adding} />
            <PrioritySelect id="task-new-priority" value={priority} onChange={setPriority} />
            <DeadlineInput id="task-new-due" value={dueDate} onChange={setDueDate} />
            <Button type="submit" disabled={adding || !title.trim()} className="gap-1.5">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Add task
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
          <CardTitle className="text-base font-medium">To do <span className="font-normal text-muted-foreground">({active.length})</span></CardTitle>
          {overdue > 0 && <span className="text-sm font-medium text-destructive">{overdue} overdue</span>}
        </CardHeader>
        <CardContent>
          {active.length === 0
            ? <p className="py-6 text-center text-sm text-muted-foreground">Nothing to do. Add a task above.</p>
            : <ul aria-label="Tasks to do">{active.map(row)}</ul>}
        </CardContent>
      </Card>

      {completed.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
            <button type="button" className="flex items-center gap-1.5 text-base font-medium" aria-expanded={showCompleted}
              onClick={() => setShowCompleted(v => !v)}>
              {showCompleted ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Completed <span className="font-normal text-muted-foreground">({completed.length})</span>
            </button>
            {showCompleted && (
              <Button type="button" variant="ghost" size="sm" className="ml-auto" disabled={clearing} onClick={() => setConfirming({ kind: "completed" })}>
                {clearing && <Loader2 className="h-4 w-4 animate-spin" />}Clear completed
              </Button>
            )}
          </CardHeader>
          {showCompleted && <CardContent><ul aria-label="Completed tasks">{completed.map(row)}</ul></CardContent>}
        </Card>
      )}

      <AlertDialog open={!!confirming} onOpenChange={open => { if (!open) setConfirming(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirming?.kind === "task" ? "Delete this task?" : `Delete ${completed.length} completed task${completed.length === 1 ? "" : "s"}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirming?.kind === "task" ? `"${confirming.task.title}" will be removed for good.` : "They will be removed for good."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={confirmDeletion}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editing && (
        <TaskEditDialog task={editing} onClose={() => setEditing(null)}
          onSaved={task => { replace(task); setEditing(null); toast.success("Task saved") }} />
      )}
    </div>
  )
}
