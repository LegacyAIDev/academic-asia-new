"use client"

import { useEffect, useState, useTransition } from "react"
import { Pencil, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useRouterWithProgress } from "@/components/layout/navigation-progress"
import { loadStudentCreateForm, loadStudentEditForm } from "@/lib/supabase/actions/student-edit-form"
import { useAddParam } from "@/lib/students/use-add-param"
import { StudentForm } from "../student-form"

type EditData = Extract<Awaited<ReturnType<typeof loadStudentEditForm>>, { success: true }>["data"]
type CreateData = Extract<Awaited<ReturnType<typeof loadStudentCreateForm>>, { success: true }>["data"]

/**
 * The student form in a side drawer, over the page the person was on. Its data
 * loads when it opens, so pages stay light. Editing stays on the page and
 * refreshes it; adding opens the new student.
 */
function StudentFormSheet({ open, onOpenChange, studentId, title, description }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present when editing. */
  studentId?: string
  title: string
  description: string
}) {
  const router = useRouterWithProgress()
  const [edit, setEdit] = useState<EditData | null>(null)
  const [create, setCreate] = useState<CreateData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, startLoading] = useTransition()

  useEffect(() => {
    if (!open) return
    // Always fetch afresh: the stale-save check needs the latest version.
    startLoading(async () => {
      setError(null)
      setEdit(null)
      setCreate(null)
      if (studentId) {
        const result = await loadStudentEditForm(studentId)
        if (result.success) setEdit(result.data)
        else setError(result.error)
      } else {
        const result = await loadStudentCreateForm()
        if (result.success) setCreate(result.data)
        else setError(result.error)
      }
    })
  }, [open, studentId])

  const ready = studentId ? edit : create

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-3xl">
        <SheetHeader className="sticky top-0 z-20 border-b bg-background px-6 py-4">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="px-5 pt-5">
          {error ? (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>
          ) : loading || !ready ? (
            <div className="space-y-4" aria-label="Loading the form">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : edit ? (
            <StudentForm
              mode="edit"
              student={edit.student}
              referenceData={edit.referenceData}
              presentSchools={edit.presentSchools}
              examPaperAttachments={edit.examPaperAttachments}
              onCancel={() => onOpenChange(false)}
              onDone={() => {
                onOpenChange(false)
                router.refresh()
              }}
            />
          ) : create ? (
            <StudentForm
              mode="create"
              referenceData={create.referenceData}
              presentSchools={create.presentSchools}
              onCancel={() => onOpenChange(false)}
              onDone={id => {
                onOpenChange(false)
                router.push(id ? `/students/${id}` : "/students")
              }}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** "Edit details" on a student's page. */
export function EditStudentSheet({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Pencil className="h-4 w-4" /> Edit details
      </Button>
      <StudentFormSheet open={open} onOpenChange={setOpen} studentId={studentId} title="Edit details" description={studentName} />
    </>
  )
}

/** "Add student", anywhere; `?add=student` on the page opens it too. */
export function AddStudentSheet({ size = "default", label = "Add student" }: { size?: "default" | "sm"; label?: string }) {
  const [open, setOpen] = useAddParam("student")
  return (
    <>
      <Button size={size} onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" /> {label}
      </Button>
      <StudentFormSheet open={open} onOpenChange={setOpen} title="Add a student" description="Only the name is required; everything else can be filled in later." />
    </>
  )
}
