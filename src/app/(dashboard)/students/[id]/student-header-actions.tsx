"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { ChevronDown, Mail, MessageSquare, MoreHorizontal, Plus, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouterWithProgress } from "@/components/layout/navigation-progress"
import { focusNoteComposer, requestNoteComposer } from "@/components/features/record-notes"
import { DeleteStudentDialog } from "./delete-student-dialog"
import { EditStudentSheet } from "./edit-student-sheet"
import { ADD_ACTIONS, type StudentSectionKey } from "./student-sections"
import { STUDENT_NOTES_ANCHOR } from "./quick-add-note-button"

/**
 * The student's main actions: Add (every kind of record, each opening its form
 * straight away), Edit details (a drawer) and a More menu for email and delete.
 */
export function StudentHeaderActions({ studentId, studentName, section, canWrite, parent, studentEmail }: {
  studentId: string
  studentName: string
  section: StudentSectionKey
  canWrite: boolean
  parent: { name: string; email: string } | null
  studentEmail: string | null
}) {
  const router = useRouterWithProgress()
  const pathname = usePathname()
  const [deleting, setDeleting] = useState(false)
  const go = (tab: string, add?: string) => router.push(`${pathname}?tab=${tab}${add ? `&add=${add}` : ""}`, { scroll: false })

  const addNote = () => {
    // Once the menu has gone, so its closing does not take focus from the note box.
    if (section === "overview") return void setTimeout(() => focusNoteComposer(STUDENT_NOTES_ANCHOR), 50)
    requestNoteComposer(studentId, STUDENT_NOTES_ANCHOR)
    go("overview")
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canWrite && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          {/* Each choice moves focus on (note box, a form), so closing must not pull it back to Add. */}
          <DropdownMenuContent align="end" className="w-56" onCloseAutoFocus={event => event.preventDefault()}>
            <DropdownMenuItem onSelect={addNote}><MessageSquare className="h-4 w-4" /> Note</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => go("documents")}><Upload className="h-4 w-4" /> Document</DropdownMenuItem>
            <DropdownMenuSeparator />
            {ADD_ACTIONS.map(action => (
              <DropdownMenuItem key={action.add} onSelect={() => go(action.section, action.add)}>
                <Plus className="h-4 w-4 text-muted-foreground" /> {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {canWrite && <EditStudentSheet studentId={studentId} studentName={studentName} />}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="More actions"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {parent && (
            <DropdownMenuItem asChild>
              <a href={`mailto:${parent.email}`}><Mail className="h-4 w-4" /> Email {parent.name || "parent"}</a>
            </DropdownMenuItem>
          )}
          {studentEmail && (
            <DropdownMenuItem asChild>
              <a href={`mailto:${studentEmail}`}><Mail className="h-4 w-4" /> Email student</a>
            </DropdownMenuItem>
          )}
          {!parent && !studentEmail && <DropdownMenuLabel className="font-normal text-muted-foreground">No email address on file</DropdownMenuLabel>}
          {canWrite && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setDeleting(true)} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4" /> Delete student
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {canWrite && <DeleteStudentDialog studentId={studentId} studentName={studentName} open={deleting} onOpenChange={setDeleting} />}
    </div>
  )
}
