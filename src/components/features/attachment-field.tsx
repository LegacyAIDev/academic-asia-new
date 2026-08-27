"use client"

import { forwardRef, useImperativeHandle, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, Link2, Loader2, Paperclip, X } from "lucide-react"
import { toast } from "sonner"
import { ALLOWED_MIME, MAX_BYTES, isSafeExternalUrl } from "@/lib/attachments/constraints"
import { ATTACH_POINTS, type AttachPointKey } from "@/lib/attachments/attach-points"
import { attachFileToRecord, attachLinkToRecord } from "@/lib/supabase/actions/record-attachments"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"
import { AttachmentList, type StagedAttachment } from "./attachment-list"

export type AttachmentFieldHandle = {
  /**
   * Upload anything staged in create mode. Resolves to the number of failures.
   *
   * `ownerIdOverride` covers the case where the owner is the record being
   * created — a new student's exam paper has no student id until the insert
   * returns one.
   */
  flush: (attachableId: string, ownerIdOverride?: string) => Promise<number>
  hasStaged: () => boolean
}

type AttachmentFieldProps = {
  attachPoint: AttachPointKey
  /** Student or school uuid — the document's owner. */
  ownerId: string
  /** Parent row uuid, or null while the record is still being created. */
  attachableId: string | null
  attachments?: AttachmentRecord[]
  canWrite?: boolean
}

/**
 * Inline "attach a file or a link" control for a field that otherwise only holds
 * text — a certificate name, an exam paper reference, a fee description.
 *
 * In edit mode attachments go straight to the server. In create mode the parent
 * row has no id yet, so they are staged locally and the dialog calls `flush`
 * with the new id once the record is saved.
 */
export const AttachmentField = forwardRef<AttachmentFieldHandle, AttachmentFieldProps>(
  function AttachmentField(
    { attachPoint, ownerId, attachableId, attachments = [], canWrite = true },
    ref,
  ) {
    const router = useRouter()
    const [staged, setStaged] = useState<StagedAttachment[]>([])
    const [linkOpen, setLinkOpen] = useState(false)
    const [linkUrl, setLinkUrl] = useState("")
    const [linkLabel, setLinkLabel] = useState("")
    const [isPending, startTransition] = useTransition()
    const fileInputRef = useRef<HTMLInputElement>(null)

    useImperativeHandle(ref, () => ({
      hasStaged: () => staged.length > 0,
      flush: async (newId: string, ownerIdOverride?: string) => {
        const owner = ownerIdOverride || ownerId
        let failed = 0
        for (const item of staged) {
          if (item.kind === "file") {
            const formData = new FormData()
            formData.append("file", item.file)
            const result = await attachFileToRecord(attachPoint, newId, owner, formData)
            if (!result.success) failed++
          } else {
            const result = await attachLinkToRecord(attachPoint, newId, owner, item.url, item.label)
            if (!result.success) failed++
          }
        }
        setStaged([])
        return failed
      },
    }), [staged, attachPoint, ownerId])

    /** Mirrors the server checks so a bad pick fails instantly instead of after an upload. */
    const rejectFile = (file: File): string | null => {
      if (!ALLOWED_MIME.includes(file.type)) return "Only PDF and image files are allowed"
      if (file.size > MAX_BYTES) return "File exceeds the 10 MB limit"
      return null
    }

    const pickFile = (file: File | null) => {
      if (!file) return
      const problem = rejectFile(file)
      if (problem) { toast.error(problem); return }

      if (!attachableId) {
        setStaged(prev => [...prev, { kind: "file", file }])
        return
      }
      startTransition(async () => {
        const formData = new FormData()
        formData.append("file", file)
        const result = await attachFileToRecord(attachPoint, attachableId, ownerId, formData)
        if (result.success) { toast.success("Attached"); router.refresh() }
        else toast.error(result.error ?? "Could not attach the file")
      })
    }

    const saveLink = () => {
      const url = linkUrl.trim()
      if (!isSafeExternalUrl(url)) { toast.error("Enter a valid http:// or https:// link"); return }

      const reset = () => { setLinkUrl(""); setLinkLabel(""); setLinkOpen(false) }

      if (!attachableId) {
        setStaged(prev => [...prev, { kind: "link", url, label: linkLabel.trim() }])
        reset()
        return
      }
      startTransition(async () => {
        const result = await attachLinkToRecord(attachPoint, attachableId, ownerId, url, linkLabel)
        if (result.success) { toast.success("Link added"); reset(); router.refresh() }
        else toast.error(result.error ?? "Could not add the link")
      })
    }

    return (
      <div className="space-y-2">
        <AttachmentList
          attachPoint={attachPoint}
          ownerId={ownerId}
          attachments={attachments}
          staged={staged}
          canWrite={canWrite}
          onRemoveStaged={i => setStaged(prev => prev.filter((_, idx) => idx !== i))}
          onDeleted={() => router.refresh()}
        />

        {canWrite && (
          <>
            <div className="flex items-center gap-1.5">
              <Button
                type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs"
                onClick={() => fileInputRef.current?.click()} disabled={isPending}
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                Attach file
              </Button>
              <Button
                type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs"
                onClick={() => setLinkOpen(v => !v)} disabled={isPending}
              >
                <Link2 className="h-3.5 w-3.5" />
                Add link
              </Button>
              <input
                ref={fileInputRef} type="file" className="hidden"
                accept={ALLOWED_MIME.join(",")}
                onChange={e => { pickFile(e.target.files?.[0] ?? null); e.target.value = "" }}
              />
            </div>

            {linkOpen && (
              <div className="flex items-center gap-1.5">
                <Input
                  value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                  placeholder="https://…" className="h-8 flex-1 text-sm" autoFocus
                />
                <Input
                  value={linkLabel} onChange={e => setLinkLabel(e.target.value)}
                  placeholder={ATTACH_POINTS[attachPoint].label} className="h-8 w-40 text-sm"
                />
                <Button
                  type="button" variant="ghost" size="icon"
                  className="h-8 w-8 shrink-0 text-emerald-600"
                  onClick={saveLink} disabled={isPending} aria-label="Save link"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                  onClick={() => { setLinkUrl(""); setLinkLabel(""); setLinkOpen(false) }}
                  aria-label="Cancel"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    )
  },
)
