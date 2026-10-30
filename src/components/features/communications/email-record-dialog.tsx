"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  checkDraft, detailsInput, draftFromEmail, emptyDraft, linksFromContext, linksFromEmail, linksInput, lockedLink,
  type EmailContext, type EmailDraft, type LinkDraft,
} from "@/lib/emails/email-draft"
import type { FiledEmailSummary } from "@/lib/emails/filed-email"
import { createManualEmail } from "@/lib/supabase/actions/filed-emails"
import { updateFiledEmail } from "@/lib/supabase/actions/filed-email-records"
import { EmailDetailFields } from "./email-detail-fields"
import { EmailLinkFields } from "./email-link-fields"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  context: EmailContext
  /** The email being edited; without it the dialog types a new manual record. */
  email?: FiledEmailSummary
  onSaved?: () => void
}

/**
 * Typing a record of an email that cannot be exported (EF-08), or correcting
 * the details and links of a filed one (EF-13, EF-21). Editing never touches
 * the stored file or body; a typed record carries its text in the summary box.
 */
export function EmailRecordDialog({ open, onOpenChange, context, email, onSaved }: Props) {
  const router = useRouter()
  const editing = !!email
  const [draft, setDraft] = useState<EmailDraft>(() => (email ? draftFromEmail(email) : emptyDraft()))
  const [links, setLinks] = useState<LinkDraft>(() => (email ? linksFromEmail(email) : linksFromContext(context)))
  const [initial] = useState(() => JSON.stringify({ draft, links }))
  const [body, setBody] = useState("")
  const [invalid, setInvalid] = useState<Partial<Record<keyof EmailDraft, boolean>>>({})
  const [bodyMissing, setBodyMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const check = checkDraft(draft, links)
    const noBody = !editing && !body.trim()
    setBodyMissing(noBody)
    if (!check.ok || noBody) {
      setInvalid(check.ok ? {} : check.invalid)
      setError(check.ok ? "Add the email text or a summary" : check.error)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const input = { links: linksInput(links), details: { ...detailsInput(draft), ...(editing ? {} : { body }) } }
      const result = email ? await updateFiledEmail(email.id, input) : await createManualEmail(input)
      if (!result.success) {
        setError(result.error ?? "Could not save")
        return
      }
      toast.success(editing ? "Email updated" : "Email record saved")
      router.refresh()
      onSaved?.()
      onOpenChange(false)
    } catch {
      setError("Could not save. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const close = (next: boolean) => {
    if (saving) return
    // WEB-06: unsaved typing or edits are not thrown away without asking.
    const dirty = editing ? JSON.stringify({ draft, links }) !== initial : !!(draft.subject.trim() || body.trim())
    if (!next && dirty && !window.confirm(editing ? "Discard your changes?" : "Discard this record?")) return
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit email details" : "Add email record"}</DialogTitle>
          <DialogDescription>
            {editing ? "Correct the details or where the email is filed. The original file stays as it is."
              : "For an email that cannot be saved as a file: type or paste what it said."}
          </DialogDescription>
        </DialogHeader>

        <fieldset disabled={saving} className="space-y-4">
          <EmailDetailFields idPrefix="email-record" draft={draft} invalid={invalid}
            onChange={next => { setDraft(next); setInvalid({}) }} />
          {!editing && (
            <div className="space-y-1.5">
              <Label htmlFor="email-record-body">Email text or summary <span className="text-destructive">*</span></Label>
              <Textarea id="email-record-body" rows={6} maxLength={20000} value={body}
                aria-invalid={bodyMissing || undefined} className={bodyMissing ? "border-destructive" : undefined}
                onChange={e => { setBody(e.target.value); setBodyMissing(false) }} />
            </div>
          )}
          <EmailLinkFields idPrefix="email-record" value={links} onChange={setLinks}
            locked={editing ? null : lockedLink(context)} />
        </fieldset>

        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={() => close(false)}>Cancel</Button>
          <Button type="button" disabled={saving} onClick={save} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Save changes" : "Save record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
