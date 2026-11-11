import { requireAccess } from "@/lib/permissions/guard"
import { MODULES } from "@/lib/permissions/modules"
import { getMyTasks } from "@/lib/supabase/queries/staff-tasks"
import { hkToday } from "@/lib/tasks/task-rules"
import { TaskPlanner } from "./task-planner"

export const metadata = { title: "Task Planner · Academic Asia" }

/**
 * Task Planner (Phase 1 spec, meeting note 2): each staff member's own to-do
 * list. Everyone who can sign in has the Dashboard, so the planner follows it.
 */
export default async function TasksPage() {
  await requireAccess(MODULES.DASHBOARD)
  const tasks = await getMyTasks()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Task Planner</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your own to-do list. Only you can see these tasks.</p>
      </div>
      {tasks ? (
        <TaskPlanner initialActive={tasks.active} initialCompleted={tasks.completed} today={hkToday()} />
      ) : (
        <p className="text-sm text-destructive" role="alert">Your tasks could not be loaded. Refresh the page to try again.</p>
      )}
    </div>
  )
}
