"use client"

import { useState, useTransition } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useRouterWithProgress } from "@/components/layout/navigation-progress"
import { loadStudentEditForm } from "@/lib/supabase/actions/student-edit-form"
import { StudentForm } from "../student-form"

type Loaded = Extract<Awaited<ReturnType<typeof loadStudentEditForm>>, { success: true }>["data"]

/** "Edit details" opens the full student form in a side drawer, over the page the person was reading. */
export function EditStudentSheet({ studentId, studentName }: { studentId: string; studentName: string }) {
  const router = useRouterWithProgress()
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, startLoading] = useTransition()

  const openSheet = () => {
    setOpen(true)
    setError(null)
    // Always fetch afresh: the stale-save check needs the latest version.
    setLoaded(null)
    startLoading(async () => {
      const result = await loadStudentEditForm(studentId)
      if (result.success) setLoaded(result.data)
      else setError(result.error)
    })
  }

  return (
    <>
      <Button variant="outline" onClick={openSheet} className="gap-2">
        <Pencil className="h-4 w-4" /> Edit details
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-3xl">
          <SheetHeader className="sticky top-0 z-20 border-b bg-background px-6 py-4">
            <SheetTitle>Edit details</SheetTitle>
            <SheetDescription>{studentName}</SheetDescription>
          </SheetHeader>
          <div className="px-5 pt-5">
            {error ? (
              <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>
            ) : loading || !loaded ? (
              <div className="space-y-4" aria-label="Loading the form">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <StudentForm
                mode="edit"
                student={loaded.student}
                referenceData={loaded.referenceData}
                presentSchools={loaded.presentSchools}
                examPaperAttachments={loaded.examPaperAttachments}
                onCancel={() => setOpen(false)}
                onDone={() => {
                  setOpen(false)
                  router.refresh()
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
