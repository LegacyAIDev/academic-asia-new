"use client"

import { useEffect, useState, useTransition } from "react"
import { Pencil, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useRouterWithProgress } from "@/components/layout/navigation-progress"
import { loadSchoolForm } from "@/lib/supabase/actions/school-form-data"
import { useAddParam } from "@/lib/students/use-add-param"
import { SchoolForm } from "./school-form"

type Loaded = Extract<Awaited<ReturnType<typeof loadSchoolForm>>, { success: true }>["data"]

/** The school form in a side drawer; editing refreshes the page, adding opens the new school. */
function SchoolFormSheet({ open, onOpenChange, schoolId, title, description }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  schoolId?: string
  title: string
  description: string
}) {
  const router = useRouterWithProgress()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, startLoading] = useTransition()

  useEffect(() => {
    if (!open) return
    startLoading(async () => {
      setError(null)
      setLoaded(null)
      const result = await loadSchoolForm(schoolId)
      if (result.success) setLoaded(result.data)
      else setError(result.error)
    })
  }, [open, schoolId])

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
          ) : loading || !loaded ? (
            <div className="space-y-4" aria-label="Loading the form">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <SchoolForm
              mode={schoolId ? "edit" : "create"}
              school={loaded.school}
              referenceData={loaded.referenceData}
              onCancel={() => onOpenChange(false)}
              onDone={id => {
                onOpenChange(false)
                if (schoolId) router.refresh()
                else router.push(id ? `/schools/${id}` : "/schools")
              }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** "Edit details" on a school's page. */
export function EditSchoolSheet({ schoolId, schoolName }: { schoolId: string; schoolName: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Pencil className="h-4 w-4" /> Edit details
      </Button>
      <SchoolFormSheet open={open} onOpenChange={setOpen} schoolId={schoolId} title="Edit details" description={schoolName} />
    </>
  )
}

/** "Add school"; `?add=school` on the page opens it too. */
export function AddSchoolSheet() {
  const [open, setOpen] = useAddParam("school")
  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" /> Add school
      </Button>
      <SchoolFormSheet open={open} onOpenChange={setOpen} title="Add a school" description="Only the name is required; fill in the rest when you have it." />
    </>
  )
}
