"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { ExternalLink, FileText, Link2, Loader2, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { getBookingPaperFilesAction, type BookingPaperFiles } from "@/lib/supabase/actions/exam-papers"

/**
 * "Print available" for one examination booking: lists the papers that can be
 * opened right now. Each file is its own link because a browser only opens one
 * new tab per click, and the links are fetched when the dialog opens because
 * they expire after a few minutes.
 */
export function ExamDeskPrintPapers({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false)
  const [papers, setPapers] = useState<BookingPaperFiles | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, startLoading] = useTransition()
  // Counts the openings, so a slow answer to an earlier opening cannot replace a newer one.
  const opening = useRef(0)

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) return
    const current = ++opening.current
    setPapers(null)
    setError(null)
    startLoading(async () => {
      const result = await getBookingPaperFilesAction(bookingId)
      if (current !== opening.current) return
      if (result.success && result.data) setPapers(result.data)
      else setError(result.error ?? "The papers could not be loaded.")
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Printer className="h-3.5 w-3.5" />
          Print available
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Papers for this examination</DialogTitle>
          <DialogDescription>Open each paper to print it. The links stop working after five minutes; reopen this window for fresh ones.</DialogDescription>
        </DialogHeader>

        {isLoading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading the papers…
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {papers && (
          <div className="space-y-4">
            {papers.files.length === 0 ? (
              <p className="text-sm text-muted-foreground">No paper is uploaded for this examination yet.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {papers.files.map((file, index) => (
                  <li key={`${file.paperId}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      {file.kind === "file" ? <FileText className="h-4 w-4 shrink-0 text-muted-foreground" /> : <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      <span className="min-w-0">
                        <span className="block font-medium">{file.subject}</span>
                        <span className="block truncate text-xs text-muted-foreground">{file.name}</span>
                      </span>
                    </span>
                    <Button size="sm" variant="outline" asChild>
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="gap-1">
                        Open <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {papers.toRequest.length > 0 && (
              <p className="text-sm">
                <span className="font-medium">Request from the school:</span> {papers.toRequest.join(", ")}
              </p>
            )}

            {papers.schoolId && (
              <Link href={`/schools/${papers.schoolId}?tab=entrance-exams`} className="text-sm underline hover:text-primary">
                Manage papers on the school page
              </Link>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
