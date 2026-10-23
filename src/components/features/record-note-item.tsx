"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { NOTE_MAX_LENGTH, formatNoteDate, formatNoteTimestamp, isEdited } from "@/lib/notes/note-format"
import type { RecordNote } from "@/lib/notes/record-note"
import { deleteRecordNote, updateRecordNote } from "@/lib/supabase/actions/record-notes"

type Props = {
  target: string
  note: RecordNote
  /** True only for the author's own note, and only for someone who may write. */
  canEdit: boolean
  onChanged: (note: RecordNote) => void
  onDeleted: (noteId: string) => void
}

/** One dated note: author and time above, text below, Edit and Delete for the author. */
export function RecordNoteItem({ target, note, canEdit, onChanged, onDeleted }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note.body)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()

  const save = () => {
    if (!draft.trim() || isPending) return
    startTransition(async () => {
      const result = await updateRecordNote(target, note.id, draft)
      if (result.success && result.data) {
        onChanged(result.data)
        setEditing(false)
        toast.success("Note saved")
      } else {
        toast.error(result.error ?? "Could not save the note.")
      }
    })
  }

  const remove = () => {
    startTransition(async () => {
      const result = await deleteRecordNote(target, note.id)
      if (result.success) {
        setConfirmDelete(false)
        onDeleted(note.id)
        toast.success("Note deleted")
      } else {
        toast.error(result.error ?? "Could not delete the note.")
      }
    })
  }

  return (
    <li className="space-y-1.5 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
        <span className={note.authorName ? "font-medium text-foreground" : ""}>{note.authorName ?? "Former staff"}</span>
        <time suppressHydrationWarning dateTime={note.createdAt} title={formatNoteTimestamp(note.createdAt)} className="tabular-nums">
          {formatNoteDate(note.createdAt)}
        </time>
        {isEdited(note.createdAt, note.updatedAt) && (
          <span title={formatNoteTimestamp(note.updatedAt)}>Edited</span>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                save()
              }
              if (e.key === "Escape") { setDraft(note.body); setEditing(false) }
            }}
            rows={3}
            maxLength={NOTE_MAX_LENGTH}
            aria-label="Edit note"
            disabled={isPending}
            autoFocus
            className="resize-y text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" className="min-h-9" disabled={isPending}
              onClick={() => { setDraft(note.body); setEditing(false) }}>
              Cancel
            </Button>
            <Button type="button" size="sm" className="min-h-9 gap-1.5" disabled={isPending || !draft.trim()} onClick={save}>
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap break-words text-sm">{note.body}</p>
      )}

      {canEdit && !editing && (
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="ghost" className="min-h-9 text-muted-foreground" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button type="button" size="sm" variant="ghost" className="min-h-9 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </div>
      )}

      {canEdit && (
        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent className="sm:max-w-[420px]">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this note?</AlertDialogTitle>
              <AlertDialogDescription>The note is removed for everyone. This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <Button type="button" variant="destructive" disabled={isPending} className="gap-1.5" onClick={remove}>
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </li>
  )
}
