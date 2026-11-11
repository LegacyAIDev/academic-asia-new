"use client"

import { useEffect, useState, useTransition } from "react"
import { Pencil, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useRouterWithProgress } from "@/components/layout/navigation-progress"
import { loadStaffForm } from "@/lib/supabase/actions/staff-form-data"
import { useAddParam } from "@/lib/students/use-add-param"
import { StaffForm } from "./staff-form"

type Loaded = Extract<Awaited<ReturnType<typeof loadStaffForm>>, { success: true }>["data"]

/** The staff form in a side drawer; editing refreshes the page, adding opens the new person. */
function StaffFormSheet({ open, onOpenChange, staffId, title, description }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  staffId?: string
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
      const result = await loadStaffForm(staffId)
      if (result.success) setLoaded(result.data)
      else setError(result.error ?? "Could not load the form")
    })
  }, [open, staffId])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="sticky top-0 z-20 border-b bg-background px-6 py-4">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="px-6 pt-5">
          {error ? (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>
          ) : loading || !loaded ? (
            <div className="space-y-4" aria-label="Loading the form">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-56 w-full" />
            </div>
          ) : (
            <StaffForm
              mode={staffId ? "edit" : "create"}
              staff={loaded.staff}
              departments={loaded.departments}
              adminLevels={loaded.adminLevels}
              modules={loaded.modules}
              levelDefaults={loaded.levelDefaults}
              initialOverrides={loaded.overrides}
              canManageAccess={loaded.canManageAccess}
              onCancel={() => onOpenChange(false)}
              onDone={id => {
                onOpenChange(false)
                if (staffId) router.refresh()
                else router.push(id ? `/staff/${id}` : "/staff")
              }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** "Add staff member"; `?add=staff` on the page opens it too. */
export function AddStaffButton() {
  const [open, setOpen] = useAddParam("staff")
  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" /> Add staff member
      </Button>
      <StaffFormSheet open={open} onOpenChange={setOpen} title="Add a staff member" description="Name, email, password and access level are enough to start." />
    </>
  )
}

/** "Edit details" on a staff member's page; `?add=details` opens it too (the old edit page lands there). */
export function EditStaffButton({ staffId, name }: { staffId: string; name: string }) {
  const [open, setOpen] = useAddParam("details")
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Pencil className="h-4 w-4" /> Edit details
      </Button>
      <StaffFormSheet open={open} onOpenChange={setOpen} staffId={staffId} title="Edit details" description={name} />
    </>
  )
}
