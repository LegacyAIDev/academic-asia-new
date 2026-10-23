"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { loadStudentLegacyLog } from "@/lib/supabase/actions/student-log-book"

/** Longest stretch shown at first; some imported logs run to half a megabyte. */
const PREVIEW_CHARS = 6000

type Props = {
  studentId: string
  /** Formatted date of the last change in the old system, if known. */
  lastUpdate: string | null
}

/** The imported log book of the old system: collapsed, read-only, loaded only when asked for. */
export function StudentLegacyLog({ studentId, lastUpdate }: Props) {
  const [text, setText] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [isPending, startTransition] = useTransition()

  const load = () => {
    startTransition(async () => {
      const result = await loadStudentLegacyLog(studentId)
      if (result.success && result.data) setText(result.data.text)
      else toast.error(result.error ?? "Could not load the old log book.")
    })
  }

  const clipped = text !== null && !showAll && text.length > PREVIEW_CHARS

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">From the old system</h2>
          {lastUpdate && <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">Last updated {lastUpdate}</p>}
        </div>
        {text === null ? (
          <Button type="button" size="sm" variant="outline" className="min-h-9 gap-1.5" disabled={isPending} onClick={load}>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Show old log book
          </Button>
        ) : (
          <Button type="button" size="sm" variant="ghost" className="min-h-9" onClick={() => { setText(null); setShowAll(false) }}>
            Hide
          </Button>
        )}
      </div>

      {text !== null && (
        <>
          {text.trim() === "" ? (
            <p className="text-sm text-muted-foreground">The old log book is empty.</p>
          ) : (
            <pre className="whitespace-pre-wrap break-words font-sans text-sm">{clipped ? text.slice(0, PREVIEW_CHARS) : text}</pre>
          )}
          {clipped && (
            <Button type="button" size="sm" variant="outline" className="min-h-9" onClick={() => setShowAll(true)}>
              Show all ({text.length.toLocaleString("en-GB")} characters)
            </Button>
          )}
        </>
      )}
    </section>
  )
}
