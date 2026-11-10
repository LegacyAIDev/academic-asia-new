"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { NOTE_LIMIT, type RecordNote } from "@/lib/notes/record-note"
import { RecordNoteComposer } from "./record-note-composer"
import { RecordNoteItem } from "./record-note-item"

type Props = {
  /** Key of the note target registry: student, application or exam. */
  target: string
  recordId: string
  initialNotes: RecordNote[]
  /** True when older notes exist beyond the newest 200 that were loaded. */
  more?: boolean
  canWrite: boolean
  currentUserId: string | null
  /** Drops the card frame when the list sits inside a dialog. */
  bare?: boolean
  /** Id of the section, so a link ending in #id scrolls here and starts a note. */
  anchorId?: string
}

const PENDING_KEY = "record-notes:start-note"

/** Asks this record's notes section to start a note once it is on screen (after a tab change). */
export function requestNoteComposer(recordId: string, anchorId: string) {
  sessionStorage.setItem(PENDING_KEY, `${recordId}:${anchorId}`)
}

/** Puts the cursor in the composer of the notes section with this id. */
export function focusNoteComposer(anchorId: string) {
  const section = document.getElementById(anchorId)
  section?.scrollIntoView({ behavior: "smooth", block: "center" })
  section?.querySelector<HTMLTextAreaElement>('textarea[aria-label="New note"]')?.focus({ preventScroll: true })
}

/** Dated notes of one record, newest first, with a composer for those who may write. */
export function RecordNotes({ target, recordId, initialNotes, more = false, canWrite, currentUserId, bare, anchorId }: Props) {
  const [notes, setNotes] = useState(initialNotes)

  // Arriving from Quick Actions > Add Note on another tab starts a note.
  useEffect(() => {
    if (!anchorId || !canWrite || sessionStorage.getItem(PENDING_KEY) !== `${recordId}:${anchorId}`) return
    sessionStorage.removeItem(PENDING_KEY)
    focusNoteComposer(anchorId)
  }, [anchorId, canWrite, recordId])

  const content = (
    <>
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Notes
        <span className="ml-1.5 tabular-nums text-muted-foreground/70">{notes.length}</span>
      </h2>

      {canWrite && (
        <RecordNoteComposer target={target} recordId={recordId} onAdded={(note) => setNotes((prev) => [note, ...prev])} />
      )}

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{canWrite ? "No notes yet. Add the first one." : "No notes yet."}</p>
      ) : (
        <ul className="divide-y">
          {notes.map((note) => (
            <RecordNoteItem
              key={note.id}
              target={target}
              note={note}
              canEdit={canWrite && currentUserId !== null && note.authorId === currentUserId}
              onChanged={(saved) => setNotes((prev) => prev.map((n) => (n.id === saved.id ? saved : n)))}
              onDeleted={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
            />
          ))}
        </ul>
      )}

      {more && <p className="text-xs text-muted-foreground">Showing newest {NOTE_LIMIT}</p>}
    </>
  )

  return <section id={anchorId} className={cn("space-y-3 scroll-mt-24", !bare && "rounded-xl border bg-card p-4")}>{content}</section>
}
