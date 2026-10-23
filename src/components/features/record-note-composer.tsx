"use client"

import { useId, useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { NOTE_MAX_LENGTH } from "@/lib/notes/note-format"
import type { RecordNote } from "@/lib/notes/record-note"
import { addRecordNote } from "@/lib/supabase/actions/record-notes"

type Props = {
  target: string
  recordId: string
  onAdded: (note: RecordNote) => void
}

/** Text box and "Add note" button. Cmd/Ctrl+Enter sends, so a long note never needs the mouse. */
export function RecordNoteComposer({ target, recordId, onAdded }: Props) {
  const [body, setBody] = useState("")
  const hintId = useId()
  const [isPending, startTransition] = useTransition()

  const submit = () => {
    if (!body.trim() || isPending) return
    startTransition(async () => {
      const result = await addRecordNote(target, recordId, body)
      if (result.success && result.data) {
        onAdded(result.data)
        setBody("")
        toast.success("Note added")
      } else {
        toast.error(result.error ?? "Could not save the note.")
      }
    })
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            submit()
          }
        }}
        rows={3}
        maxLength={NOTE_MAX_LENGTH}
        placeholder="Write a note..."
        aria-label="New note"
        aria-describedby={hintId}
        disabled={isPending}
        className="resize-y text-sm"
      />
      <div className="flex items-center justify-between gap-3">
        <span id={hintId} className="text-xs text-muted-foreground">Ctrl or Cmd + Enter to add</span>
        <Button type="button" size="sm" className="min-h-9 gap-1.5" disabled={isPending || !body.trim()} onClick={submit}>
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Add note
        </Button>
      </div>
    </div>
  )
}
