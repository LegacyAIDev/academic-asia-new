"use client"

import { CheckCircle2, FileText, Loader2, Paperclip, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatFileSize } from "@/lib/attachments/constraints"
import { SOURCE_LABELS } from "@/lib/emails/email-files"
import { EmailDetailFields } from "./email-detail-fields"
import { EmailLinkFields } from "./email-link-fields"
import type { StagedEmail } from "./use-staged-emails"

type Props = {
  item: StagedEmail
  locked: "student" | "school"
  disabled: boolean
  onChange: (change: Partial<StagedEmail>) => void
  onRemove: () => void
}

/** One picked email: its file, the details read from it (editable) and where it will be filed. */
export function StagedEmailCard({ item, locked, disabled, onChange, onRemove }: Props) {
  const done = item.status === "saved"
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.file.name}</p>
          <p className="text-xs text-muted-foreground">
            {item.source ? SOURCE_LABELS[item.source] : "Unsupported file"} · {formatFileSize(item.file.size)}
            {item.attachmentNames.length > 0 && ` · ${item.attachmentNames.length} attachment${item.attachmentNames.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {item.status === "reading" && <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Reading</Badge>}
        {item.status === "saving" && <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving</Badge>}
        {done && <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Filed</Badge>}
        {!done && (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={disabled}
            aria-label={`Remove ${item.file.name}`} onClick={onRemove}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {item.error && <p className="text-sm text-destructive" role="alert">{item.error}</p>}
      {item.notice && !done && <p className="text-sm text-muted-foreground" role="status">{item.notice}</p>}
      {item.source === "pdf" && !done && (
        <p className="text-xs text-muted-foreground">A PDF cannot be read for its details; type the subject, date and sender.</p>
      )}

      {!item.blocked && !done && item.status !== "reading" && (
        <fieldset disabled={disabled || item.status === "saving"} className="space-y-4">
          <EmailDetailFields idPrefix={item.key} draft={item.draft} invalid={item.invalid}
            onChange={draft => onChange({ draft, invalid: {} })} />
          <EmailLinkFields idPrefix={item.key} value={item.links} locked={locked} onChange={links => onChange({ links })} />
          {item.attachmentNames.length > 0 && (
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Paperclip className="h-3.5 w-3.5" />
              {item.attachmentNames.join(", ")}
            </p>
          )}
        </fieldset>
      )}
    </div>
  )
}
