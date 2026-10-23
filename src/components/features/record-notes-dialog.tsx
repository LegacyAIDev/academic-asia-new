"use client"

import { useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { RecordNote } from "@/lib/notes/record-note"
import { listRecordNotes } from "@/lib/supabase/actions/record-notes"
import { RecordNotes } from "./record-notes"

type Props = {
  target: string
  recordId: string
  /** Names the record in the dialog title, e.g. "Lucas Ng · Mathematics". */
  title: string
  canWrite: boolean
  currentUserId: string | null
}

type Loaded = { notes: RecordNote[]; more: boolean }

/** A "Notes" button that loads the list when opened, for rows that cannot afford a query each. */
export function RecordNotesDialog({ target, recordId, title, canWrite, currentUserId }: Props) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Closing and reopening quickly can leave two loads in flight; only the latest may update the list.
  const latestLoad = useRef(0)

  const load = async () => {
    const request = ++latestLoad.current
    setError(null)
    const result = await listRecordNotes(target, recordId)
    if (request !== latestLoad.current) return
    if (result.success && result.data) setLoaded(result.data)
    else setError(result.error ?? "Could not load the notes.")
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    // Reload on every open so notes added by a colleague since the last visit show up.
    if (next) {
      setLoaded(null)
      void load()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="min-h-9">Notes</Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-lg"
        onEscapeKeyDown={(event) => {
          // Escape in a note being written or edited cancels that edit; it must not
          // close the dialog and throw the text away.
          const field = event.target
          if (field instanceof HTMLTextAreaElement && field.value.trim()) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Notes</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        {error ? (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-destructive">{error}</p>
            <Button type="button" size="sm" variant="outline" className="min-h-9" onClick={() => void load()}>Try again</Button>
          </div>
        ) : loaded ? (
          <RecordNotes bare target={target} recordId={recordId} initialNotes={loaded.notes} more={loaded.more}
            canWrite={canWrite} currentUserId={currentUserId} />
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading notes
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
