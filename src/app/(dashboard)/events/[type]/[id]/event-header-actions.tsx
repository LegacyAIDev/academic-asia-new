"use client"

import { useState } from "react"
import Link from "next/link"
import { CalendarClock, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DeleteEventDialog } from "./delete-event-dialog"
import { EditEventButton } from "../../event-form-sheet"

/** Schedule sessions (1-to-1 events), Edit details, and Delete kept under More. */
export function EventHeaderActions({ eventId, eventName, eventType, canSchedule, canWrite }: {
  eventId: string
  eventName: string
  eventType: string
  canSchedule: boolean
  canWrite: boolean
}) {
  const [deleting, setDeleting] = useState(false)
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canSchedule && (
        <Button variant="outline" className="gap-2" asChild>
          <Link href={`/events/${eventType}/${eventId}/scheduler`}><CalendarClock className="h-4 w-4" /> Schedule sessions</Link>
        </Button>
      )}
      {canWrite && (
        <>
          <EditEventButton className="gap-2"><Pencil className="h-4 w-4" /> Edit details</EditEventButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => setDeleting(true)} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4" /> Delete event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DeleteEventDialog eventId={eventId} eventName={eventName} eventType={eventType} open={deleting} onOpenChange={setDeleting} />
        </>
      )}
    </div>
  )
}
