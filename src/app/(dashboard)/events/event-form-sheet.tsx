"use client"

import { useEffect, useState, useTransition } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useRouterWithProgress } from "@/components/layout/navigation-progress"
import { loadEventForm } from "@/lib/supabase/actions/event-form-data"
import { useAddParam } from "@/lib/students/use-add-param"
import { EventForm } from "./[type]/event-form"

type Loaded = Extract<Awaited<ReturnType<typeof loadEventForm>>, { success: true }>["data"]

/**
 * The event form in a side drawer, as for students and schools. Data loads
 * when it opens; `focus` scrolls to a part of the form (e.g. "schools").
 * Adding opens the new event; editing refreshes the page it was opened on.
 */
export function EventFormSheet({ open, onOpenChange, typeSlug, eventId, title, description, focus }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  typeSlug: string
  eventId?: string
  title: string
  description: string
  focus?: string | null
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
      const result = await loadEventForm(typeSlug, eventId)
      if (result.success) setLoaded(result.data)
      else setError(result.error)
    })
  }, [open, typeSlug, eventId])

  // Once the form is there, bring the asked-for part into view.
  useEffect(() => {
    if (!loaded || !focus || focus === "details") return
    const timer = setTimeout(() => document.getElementById(focus)?.scrollIntoView({ behavior: "smooth", block: "start" }), 150)
    return () => clearTimeout(timer)
  }, [loaded, focus])

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
            <EventForm
              mode={eventId ? "edit" : "create"}
              eventType={typeSlug}
              event={loaded.event}
              referenceData={loaded.referenceData}
              existingSchoolIds={loaded.existingSchoolIds}
              defaultEventType={eventId ? null : loaded.defaultEventType}
              onCancel={() => onOpenChange(false)}
              onDone={id => {
                onOpenChange(false)
                if (eventId) router.refresh()
                else router.push(`/events/${typeSlug}/${id}`)
              }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** "Add [kind]" on a category list; `?add=event` opens it too. */
export function AddEventButton({ typeSlug, label }: { typeSlug: string; label: string }) {
  const [open, setOpen] = useAddParam("event")
  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add {label.toLowerCase()}</Button>
      <EventFormSheet open={open} onOpenChange={setOpen} typeSlug={typeSlug} title={`Add ${label.toLowerCase()}`} description="Only the name and kind are needed to start." />
    </>
  )
}

/**
 * The edit drawer of an event page, opened by `?edit=<part>` (details, schools,
 * representatives, admission), so "Edit details" and every "Add schools"
 * prompt open it at the right place; closing takes the parameter away.
 */
export function EditEventSheet({ typeSlug, eventId, eventName }: { typeSlug: string; eventId: string; eventName: string }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouterWithProgress()
  const focus = searchParams.get("edit")
  const close = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("edit")
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }
  return (
    <EventFormSheet
      open={focus !== null}
      onOpenChange={next => { if (!next) close() }}
      typeSlug={typeSlug}
      eventId={eventId}
      focus={focus}
      title="Edit details"
      description={eventName}
    />
  )
}

/** A link-like button that opens the event's edit drawer at one part of the form. */
export function EditEventButton({ part = "details", children, variant = "outline", size = "default", className }: {
  part?: string
  children: React.ReactNode
  variant?: "outline" | "default"
  size?: "default" | "sm"
  className?: string
}) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouterWithProgress()
  const openAt = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("edit", part)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }
  return (
    <Button variant={variant} size={size} className={className} onClick={openAt}>
      {children}
    </Button>
  )
}

