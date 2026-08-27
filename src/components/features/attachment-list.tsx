"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, ExternalLink, FileText, Link2, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { formatFileSize, isSafeExternalUrl, urlHostname } from "@/lib/attachments/constraints"
import { openInNewTab } from "@/lib/attachments/open-in-new-tab"
import { getAttachmentSignedUrl, deleteAttachment } from "@/lib/supabase/actions/record-attachments"
import type { AttachPointKey } from "@/lib/attachments/attach-points"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"

/** A file or link chosen before the parent record exists. */
export type StagedAttachment =
  | { kind: "file"; file: File }
  | { kind: "link"; url: string; label: string }

type AttachmentListProps = {
  attachPoint: AttachPointKey
  ownerId: string
  attachments: AttachmentRecord[]
  staged: StagedAttachment[]
  canWrite: boolean
  onRemoveStaged: (index: number) => void
  onDeleted: () => void
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm">
      {children}
    </div>
  )
}

export function AttachmentList({
  attachPoint, ownerId, attachments, staged, canWrite, onRemoveStaged, onDeleted,
}: AttachmentListProps) {
  // Per-row rather than a single flag: with several attachments the spinner has
  // to sit on the one that was actually clicked.
  const [busyId, setBusyId] = useState<string | null>(null)

  const open = async (attachment: AttachmentRecord) => {
    if (attachment.external_url) {
      // Re-checked at render time: a row could predate the write-side validation.
      if (!isSafeExternalUrl(attachment.external_url)) {
        toast.error("This link is not a valid web address")
        return
      }
      openInNewTab(attachment.external_url)
      return
    }
    if (!attachment.file_path) return

    setBusyId(attachment.id)
    try {
      const result = await getAttachmentSignedUrl(attachPoint, attachment.file_path)
      if (result.success && result.data?.url) openInNewTab(result.data.url)
      else toast.error(result.error ?? "Could not open the file")
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (attachmentId: string) => {
    setBusyId(attachmentId)
    try {
      const result = await deleteAttachment(attachPoint, attachmentId, ownerId)
      if (result.success) onDeleted()
      else toast.error(result.error ?? "Could not remove the attachment")
    } finally {
      setBusyId(null)
    }
  }

  if (attachments.length === 0 && staged.length === 0) {
    return <p className="text-xs text-muted-foreground">No attachment</p>
  }

  return (
    <div className="space-y-1.5">
      {attachments.map(attachment => {
        const isLink = Boolean(attachment.external_url)
        const busy = busyId === attachment.id
        return (
          <Row key={attachment.id}>
            {isLink
              ? <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              : <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            <div className="min-w-0 flex-1">
              <p className="truncate">{attachment.title || attachment.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {isLink ? urlHostname(attachment.external_url!) : formatFileSize(attachment.file_size)}
              </p>
            </div>
            <Button
              type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0"
              onClick={() => open(attachment)} disabled={busy}
              aria-label={isLink ? "Open link" : "Download file"}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : isLink ? <ExternalLink className="h-3.5 w-3.5" />
                : <Download className="h-3.5 w-3.5" />}
            </Button>
            {canWrite && (
              <Button
                type="button" variant="ghost" size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(attachment.id)} disabled={busy} aria-label="Remove attachment"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </Row>
        )
      })}

      {staged.map((item, index) => (
        <Row key={`staged-${index}`}>
          {item.kind === "link"
            ? <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            : <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          <div className="min-w-0 flex-1">
            <p className="truncate">{item.kind === "file" ? item.file.name : item.label || item.url}</p>
            <p className="text-xs text-muted-foreground">
              {item.kind === "file" ? formatFileSize(item.file.size) : urlHostname(item.url)}
              {" · saves with the record"}
            </p>
          </div>
          <Button
            type="button" variant="ghost" size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemoveStaged(index)} aria-label="Remove staged attachment"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </Row>
      ))}
    </div>
  )
}
