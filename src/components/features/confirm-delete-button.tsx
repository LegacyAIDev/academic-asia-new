"use client"

import { useState, useTransition, type ReactNode } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { ActionResult } from "@/lib/action-result"

/**
 * The bin icon on a record row, and the "are you sure" dialog it opens. The
 * dialog stays open with the error if the delete fails; the action revalidates
 * the page, so a success needs nothing more than closing it.
 */
export function ConfirmDeleteButton({ title, description, failMessage, onDelete }: {
  /** Dialog heading, e.g. "Delete Fee". */
  title: string
  /** What will be deleted, in a sentence. */
  description: ReactNode
  /** Shown when the action fails without saying why. */
  failMessage: string
  onDelete: () => Promise<ActionResult<unknown>>
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const result = await onDelete()
      if (result.success) setOpen(false)
      else setError(result.error ?? failMessage)
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button aria-label="Delete" title="Delete" variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={() => setOpen(true)}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <AlertDialogContent className="sm:max-w-[420px]">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/10"><Trash2 className="h-5 w-5 text-destructive" /></div>
            <div className="space-y-1.5">
              <AlertDialogTitle className="text-lg">{title}</AlertDialogTitle>
              <AlertDialogDescription>{description}</AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel disabled={isPending} className="rounded-lg">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending} className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2">
            {isPending ? (<><Loader2 className="h-4 w-4 animate-spin" />Deleting...</>) : (<><Trash2 className="h-4 w-4" />Delete</>)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
