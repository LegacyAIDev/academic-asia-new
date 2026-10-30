"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronDown, ChevronRight, Download, History, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ALLOWED_MIME, MAX_BYTES, formatFileSize } from "@/lib/attachments/constraints"
import { openInNewTab } from "@/lib/attachments/open-in-new-tab"
import { versionLabel } from "@/lib/attachments/versions"
import type { AttachPointKey } from "@/lib/attachments/attach-points"
import { formatEmailDate } from "@/lib/emails/email-form"
import { getAttachmentSignedUrl } from "@/lib/supabase/actions/record-attachment-signed-url"
import { listAttachmentVersions, replaceAttachmentFile, type AttachmentVersion } from "@/lib/supabase/actions/record-attachment-versions"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"

type Props = { attachPoint: AttachPointKey; ownerId: string; attachment: AttachmentRecord; canWrite: boolean }

/** "Version 2 · uploaded by Maggie Manager · 30/10/2026 14:05" under a versioned file. */
export function VersionLine({ attachment }: { attachment: AttachmentRecord }) {
  const parts = [versionLabel(attachment.earlier_versions)]
  if (attachment.uploaded_by_name) parts.push(`uploaded by ${attachment.uploaded_by_name}`)
  if (attachment.created_at) parts.push(formatEmailDate(attachment.created_at))
  return <p className="text-xs text-muted-foreground">{parts.join(" · ")}</p>
}

/**
 * Replace a paper with the school's updated one, and look back at the earlier
 * files (ASM-03, ASM-05). Nothing is lost: each replaced file stays openable.
 */
export function AttachmentVersionControls({ attachPoint, ownerId, attachment, canWrite }: Props) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [replacing, setReplacing] = useState(false)
  const [open, setOpen] = useState(false)
  const [versions, setVersions] = useState<AttachmentVersion[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const replace = async (file: File | null) => {
    if (!file) return
    if (!ALLOWED_MIME.includes(file.type)) return toast.error("Only PDF and image files are allowed")
    if (file.size > MAX_BYTES) return toast.error("File exceeds the 10 MB limit")
    setReplacing(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const result = await replaceAttachmentFile(attachPoint, attachment.id, ownerId, formData)
      if (!result.success) return toast.error(result.error ?? "Could not replace the file")
      toast.success("New version saved; the earlier one is kept in the history")
      setVersions(null)
      setOpen(false)
      router.refresh()
    } catch {
      toast.error("Could not replace the file")
    } finally {
      setReplacing(false)
    }
  }

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (next && versions === null) {
      const result = await listAttachmentVersions(attachPoint, attachment.id).catch(() => null)
      setVersions(result?.success ? result.data ?? [] : [])
      if (!result?.success) toast.error(result?.error ?? "Could not load the earlier versions")
    }
  }

  const download = async (version: AttachmentVersion) => {
    if (!version.filePath) return
    setBusyId(version.id)
    try {
      const result = await getAttachmentSignedUrl(attachPoint, version.filePath)
      if (result.success && result.data?.url) openInNewTab(result.data.url)
      else toast.error(result.error ?? "Could not open the file")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-1 pl-5">
      <div className="flex flex-wrap items-center gap-1">
        {canWrite && (
          <>
            <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs" disabled={replacing}
              onClick={() => input.current?.click()}>
              {replacing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Replace with new version
            </Button>
            <input ref={input} type="file" className="hidden" accept={ALLOWED_MIME.join(",")} aria-label={`New version of ${attachment.file_name ?? "the file"}`}
              onChange={e => { void replace(e.target.files?.[0] ?? null); e.target.value = "" }} />
          </>
        )}
        {attachment.earlier_versions > 0 && (
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs" aria-expanded={open} onClick={toggle}>
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <History className="h-3.5 w-3.5" />
            Earlier versions ({attachment.earlier_versions})
          </Button>
        )}
      </div>
      {open && (
        <ol className="space-y-1" aria-label="Earlier versions">
          {versions === null && <li className="text-xs text-muted-foreground">Loading…</li>}
          {versions?.map((version, i) => (
            <li key={version.id} className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{versionLabel(attachment.earlier_versions - 1 - i)} · {version.name}</p>
                <p className="text-muted-foreground">
                  {[version.uploadedBy && `uploaded by ${version.uploadedBy}`, formatEmailDate(version.uploadedAt),
                    version.replacedAt && `replaced ${formatEmailDate(version.replacedAt)}`, formatFileSize(version.fileSize)]
                    .filter(Boolean).join(" · ")}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={busyId === version.id}
                onClick={() => download(version)} aria-label={`Open ${versionLabel(attachment.earlier_versions - 1 - i)}`}>
                {busyId === version.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              </Button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
