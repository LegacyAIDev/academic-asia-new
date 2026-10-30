"use client"

import Link from "next/link"
import { useState } from "react"
import { Download, Loader2, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatFileSize } from "@/lib/attachments/constraints"
import { openInNewTab } from "@/lib/attachments/open-in-new-tab"
import { formatEmailDate } from "@/lib/emails/email-form"
import { EMAIL_FRAME_SANDBOX, emailViewerDocument } from "@/lib/emails/email-viewer-document"
import type { FiledEmailDetail } from "@/lib/emails/filed-email"
import { getFiledEmailFileUrl } from "@/lib/supabase/actions/filed-email-records"

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

/** From, to, date, the records it is filed on, and who filed or changed it (EF-15, EF-23). */
export function EmailHeader({ email }: { email: FiledEmailDetail }) {
  return (
    <dl className="space-y-1.5">
      <Row label="From">{email.from}</Row>
      {email.to.length > 0 && <Row label="To">{email.to.join("; ")}</Row>}
      {email.cc.length > 0 && <Row label="Cc">{email.cc.join("; ")}</Row>}
      <Row label="Date">{formatEmailDate(email.sentAt)}</Row>
      <Row label="Filed on">
        <span className="flex flex-wrap gap-x-3 gap-y-1">
          {email.student && <Link className="underline-offset-2 hover:underline" href={`/students/${email.student.id}?tab=communications`}>{email.student.name}</Link>}
          {email.school && <Link className="underline-offset-2 hover:underline" href={`/schools/${email.school.id}?tab=communications`}>{email.school.name}</Link>}
          {email.student && email.application && (
            <Link className="underline-offset-2 hover:underline" href={`/students/${email.student.id}/applications/${email.application.id}`}>
              {email.application.label}
            </Link>
          )}
        </span>
      </Row>
      <Row label="History">
        Filed by {email.createdByName} · {formatEmailDate(email.createdAt)}
        {email.updatedByName && <><br />Edited by {email.updatedByName} · {formatEmailDate(email.updatedAt)}</>}
      </Row>
      {email.staffNote && <Row label="Staff note"><span className="whitespace-pre-wrap">{email.staffNote}</span></Row>}
    </dl>
  )
}

/**
 * The body in a sandboxed frame: no scripts, no access to the app, and nothing
 * loads from the network, so remote images and trackers stay silent (EF-17).
 */
export function EmailBody({ email }: { email: FiledEmailDetail }) {
  if (email.bodyHtml) {
    return (
      <iframe title={`Email: ${email.subject}`} sandbox={EMAIL_FRAME_SANDBOX} srcDoc={emailViewerDocument(email.bodyHtml)}
        className="h-[28rem] w-full rounded-md border bg-white" referrerPolicy="no-referrer" />
    )
  }
  if (email.bodyText) {
    return <div className="max-h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-md border p-4 text-sm">{email.bodyText}</div>
  }
  return (
    <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      {email.source === "pdf" ? "This email was filed as a PDF. Download the original to read it." : "This email has no text."}
    </p>
  )
}

function useOpenFile(emailId: string) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const open = async (part: "original" | number) => {
    setBusy(String(part))
    setError(null)
    try {
      const result = await getFiledEmailFileUrl(emailId, part)
      if (result.success && result.data) openInNewTab(result.data.url)
      else setError(result.error ?? "Could not open the file")
    } catch {
      setError("Could not open the file")
    } finally {
      setBusy(null)
    }
  }
  return { open, busy, error }
}

/** Attachments one by one, and the original file whole (EF-18). */
export function EmailFiles({ email }: { email: FiledEmailDetail }) {
  const { open, busy, error } = useOpenFile(email.id)
  if (email.attachments.length === 0 && !email.fileName) return null
  return (
    <div className="space-y-2">
      {email.attachments.length > 0 && (
        <ul className="space-y-1" aria-label="Attachments">
          {email.attachments.map((a, i) => (
            <li key={`${i}-${a.name}`}>
              <Button type="button" variant="ghost" size="sm" className="h-auto gap-2 px-2 py-1.5 font-normal"
                disabled={busy !== null} onClick={() => open(i)}>
                {busy === String(i) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                <span className="truncate">{a.name}</span>
                <span className="text-xs text-muted-foreground">{formatFileSize(a.size)}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
      {email.fileName && (
        <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={busy !== null} onClick={() => open("original")}>
          {busy === "original" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download original
        </Button>
      )}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  )
}
