"use client"

import { useState, useTransition } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, Pencil, Trash2, CalendarDays, Check } from "lucide-react"
import {
  createStudentEventApplication, updateStudentEventApplication,
  deleteStudentEventApplication, type CreateEventAppInput,
} from "@/lib/supabase/actions/student-event-applications"
import type { EventAppWithJoins } from "@/lib/supabase/queries/student-event-applications"
import { EventAppFormContent } from "./event-app-form-content"
import type { PieceEntry } from "./event-app-pieces-section"

type EventTypeItem = { id: number; code: string; label: string; color: string | null; category_id: number | null }
type EventItem = {
  id: string; name: string; event_type_id: number
  start_date: string | null; start_time: string | null; end_time: string | null
  capacity: number | null; school_id: string | null
  school: { name: string } | null
}
type StatusItem = { id: number; code: string; label: string }
type RepresentativeItem = { id: string; event_id: string; name: string }

export type EventAppReferenceData = {
  eventTypes: EventTypeItem[]
  events: EventItem[]
  statuses: StatusItem[]
  representatives: RepresentativeItem[]
}

type EventApplicationDialogProps = {
  studentId: string
  referenceData: EventAppReferenceData
  mode: "create" | "edit"
  application?: EventAppWithJoins
  trigger?: React.ReactNode
}

export function EventApplicationDialog({
  studentId, referenceData, mode, application, trigger,
}: EventApplicationDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const initialEventTypeId = application?.event?.event_type_id?.toString() ?? ""
  const [selectedEventTypeId, setSelectedEventTypeId] = useState(initialEventTypeId)
  const [selectedEventId, setSelectedEventId] = useState(application?.event_id ?? "")
  const [pieces, setPieces] = useState<PieceEntry[]>(application?.pieces ?? [])

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (value) {
      setSelectedEventTypeId(initialEventTypeId)
      setSelectedEventId(application?.event_id ?? "")
      setPieces(application?.pieces ?? [])
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)

    const input: Omit<CreateEventAppInput, 'student_id'> = {
      event_id: (fd.get("event_id") as string) || null,
      status_id: fd.get("status_id") ? parseInt(fd.get("status_id") as string, 10) : null,
      representative_id: (fd.get("representative_id") as string) || null,
      seats_requested: fd.get("seats_requested") ? parseInt(fd.get("seats_requested") as string, 10) : null,
      seats_assigned: fd.get("seats_assigned") ? parseInt(fd.get("seats_assigned") as string, 10) : null,
      pieces: pieces.length > 0 ? pieces.filter((p) => p.piece || p.composer) : null,
      remarks: (fd.get("remarks") as string) || null,
    }

    startTransition(async () => {
      let result
      if (mode === "create") {
        result = await createStudentEventApplication({ ...input, student_id: studentId } as CreateEventAppInput)
      } else if (application?.id) {
        result = await updateStudentEventApplication(application.id, studentId, input)
      }
      if (result?.success) {
        setOpen(false)
      } else {
        setError(result?.error ?? "An error occurred")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-2 shadow-sm bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Event Application
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:!max-w-[620px] !max-h-[92vh] !overflow-hidden !p-0 !gap-0 bg-background flex flex-col" showCloseButton={false}>
        <div className="relative overflow-hidden border-b border-border/50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
          <div className="relative flex items-center gap-4 px-6 py-5">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
                <CalendarDays className="h-5 w-5" />
              </div>
            </div>
            <DialogHeader className="flex-1 space-y-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {mode === "create" ? "New Event Application" : "Edit Event Application"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "create" ? "Register for an event" : "Update event application details"}
              </p>
            </DialogHeader>
            <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {error && (
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                <span className="font-medium">{error}</span>
              </div>
            )}
            <EventAppFormContent
              referenceData={referenceData}
              application={application}
              selectedEventTypeId={selectedEventTypeId}
              onEventTypeChange={setSelectedEventTypeId}
              selectedEventId={selectedEventId}
              onEventIdChange={setSelectedEventId}
              pieces={pieces}
              onPiecesChange={setPieces}
            />
          </div>
          <div className="border-t border-border bg-muted/50 px-6 py-4">
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
              <Button type="submit" disabled={isPending} className="min-w-[140px] gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                {isPending ? <><Loader2 className="h-4 w-4 animate-spin" />{mode === "create" ? "Creating..." : "Saving..."}</>
                  : <>{mode === "create" ? <Plus className="h-4 w-4" /> : <Check className="h-4 w-4" />}{mode === "create" ? "Create Entry" : "Save Changes"}</>}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Edit button for existing event applications */
export function EditEventApplicationButton({ application, studentId, referenceData }: {
  application: EventAppWithJoins; studentId: string; referenceData: EventAppReferenceData
}) {
  return (
    <EventApplicationDialog studentId={studentId} referenceData={referenceData} mode="edit" application={application}
      trigger={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"><Pencil className="h-3.5 w-3.5" /></Button>}
    />
  )
}

/** Delete event application dialog */
export function DeleteEventApplicationButton({ applicationId, studentId, eventName }: {
  applicationId: string; studentId: string; eventName: string
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteStudentEventApplication(applicationId, studentId)
      if (result.success) setOpen(false)
      else setError(result.error ?? "Failed to delete")
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setOpen(true)}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <AlertDialogContent className="sm:max-w-[420px]">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/10"><Trash2 className="h-5 w-5 text-destructive" /></div>
            <div className="space-y-1.5">
              <AlertDialogTitle>Delete Event Application</AlertDialogTitle>
              <AlertDialogDescription>Delete the application for <strong className="text-foreground">{eventName}</strong>? This cannot be undone.</AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2">
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Deleting...</> : <><Trash2 className="h-4 w-4" />Delete</>}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
