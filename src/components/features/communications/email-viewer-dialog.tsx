"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Archive, ArchiveRestore, Loader2, Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DIRECTION_LABELS } from "@/lib/emails/email-form"
import type { FiledEmailDetail } from "@/lib/emails/filed-email"
import { deleteFiledEmail, getFiledEmailDetail, setFiledEmailArchived } from "@/lib/supabase/actions/filed-email-records"
import { EmailBody, EmailFiles, EmailHeader } from "./email-viewer-parts"

type Props = {
  emailId: string | null
  onClose: () => void
  canWrite: boolean
  canDelete: boolean
  onEdit: (email: FiledEmailDetail) => void
}

/** Opens one filed email in full, with edit, archive, restore and (managers) delete. */
export function EmailViewerDialog({ emailId, onClose, canWrite, canDelete, onEdit }: Props) {
  const router = useRouter()
  // Each answer is kept with the email it belongs to; opening another email shows "Opening…" until its own arrives.
  const [loaded, setLoaded] = useState<{ id: string; email: FiledEmailDetail | null; error: string | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const latest = useRef(0)
  const current = loaded && loaded.id === emailId ? loaded : null
  const email = current?.email ?? null
  const error = current?.error ?? null

  useEffect(() => {
    if (!emailId) return
    const request = ++latest.current
    getFiledEmailDetail(emailId)
      .then(result => {
        if (request !== latest.current) return
        setLoaded(result.success && result.data
          ? { id: emailId, email: result.data, error: null }
          : { id: emailId, email: null, error: result.error ?? "Could not open the email" })
      })
      .catch(() => { if (request === latest.current) setLoaded({ id: emailId, email: null, error: "Could not open the email" }) })
  }, [emailId])

  const run = async (action: () => Promise<{ success: boolean; error?: string }>, done: string) => {
    setBusy(true)
    try {
      const result = await action()
      if (!result.success) return toast.error(result.error ?? "Something went wrong")
      toast.success(done)
      router.refresh()
      onClose()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  const archived = !!email?.archivedAt

  return (
    <>
      <Dialog open={!!emailId} onOpenChange={next => { if (!next && !busy) onClose() }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="pr-6">{email?.subject ?? "Email"}</DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-wrap gap-1.5">
                {email && <Badge variant="secondary">{DIRECTION_LABELS[email.direction]}</Badge>}
                {archived && <Badge variant="outline">Archived</Badge>}
              </div>
            </DialogDescription>
          </DialogHeader>

          {!email && !error && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Opening…</p>}
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          {email && (
            <div className="space-y-4">
              <EmailHeader email={email} />
              <EmailBody email={email} />
              <EmailFiles email={email} />
            </div>
          )}

          {email && (canWrite || canDelete) && (
            <DialogFooter className="gap-2 sm:justify-between">
              <div>
                {canDelete && (
                  <Button type="button" variant="ghost" className="gap-1.5 text-destructive" disabled={busy} onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-4 w-4" />Delete for good
                  </Button>
                )}
              </div>
              {canWrite && (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="gap-1.5" disabled={busy}
                    onClick={() => run(() => setFiledEmailArchived(email.id, !archived), archived ? "Email restored" : "Email archived")}>
                    {archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    {archived ? "Restore" : "Archive"}
                  </Button>
                  <Button type="button" className="gap-1.5" disabled={busy} onClick={() => onEdit(email)}>
                    <Pencil className="h-4 w-4" />Edit
                  </Button>
                </div>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={next => { if (!busy) setConfirmDelete(next) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this email for good?</AlertDialogTitle>
            <AlertDialogDescription>
              The email, its attachments and the original file are removed and cannot be brought back. To hide it instead, archive it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} className="bg-destructive text-white hover:bg-destructive/90"
              onClick={e => { e.preventDefault(); if (email) void run(() => deleteFiledEmail(email.id), "Email deleted") }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
