"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EMAIL_FILE_ACCEPT } from "@/lib/emails/email-files"
import { linksFromContext, lockedLink, type EmailContext } from "@/lib/emails/email-draft"
import { StagedEmailCard } from "./staged-email-card"
import { MAX_BATCH, useStagedEmails } from "./use-staged-emails"

type Props = { open: boolean; onOpenChange: (open: boolean) => void; context: EmailContext }

/**
 * "File email" (EF-01 to EF-07): drop or browse for .eml, .msg or PDF files,
 * check what was read from each, choose where it goes and save them all.
 */
export function FileEmailDialog({ open, onOpenChange, context }: Props) {
  const router = useRouter()
  const defaultLinks = useMemo(() => linksFromContext(context), [context])
  const staged = useStagedEmails(defaultLinks)
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const add = (files: FileList | null) => {
    if (!files?.length) return
    const left = staged.addFiles(Array.from(files))
    if (left > 0) toast.warning(`Up to ${MAX_BATCH} emails at a time; ${left} not added.`)
  }

  const save = async () => {
    const { saved, failed } = await staged.saveAll()
    if (saved > 0) {
      toast.success(`Filed ${saved} email${saved === 1 ? "" : "s"}`)
      router.refresh()
    }
    if (failed === 0 && saved > 0) {
      staged.reset()
      onOpenChange(false)
    }
  }

  const close = (next: boolean) => {
    if (!next && staged.saving) return
    // WEB-06: closing with emails still waiting to be filed asks first.
    if (!next && staged.pendingCount > 0 && !window.confirm("Discard the emails that have not been filed yet?")) return
    if (!next) staged.reset()
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>File email</DialogTitle>
          <DialogDescription>
            Save the email from Outlook (.msg) or your mail app (.eml), or print it to PDF, then add it here.
          </DialogDescription>
        </DialogHeader>

        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); add(e.dataTransfer.files) }}
          className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors ${dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}`}
        >
          <Upload className="h-6 w-6 text-muted-foreground" />
          <p>Drag emails here, or</p>
          <Button type="button" variant="outline" size="sm" disabled={staged.saving} onClick={() => input.current?.click()}>
            Browse
          </Button>
          <p className="text-xs text-muted-foreground">.eml, .msg or PDF · up to 25 MB each · up to {MAX_BATCH} at once</p>
          <input ref={input} type="file" multiple accept={EMAIL_FILE_ACCEPT} className="sr-only" tabIndex={-1}
            aria-label="Choose email files" onChange={e => { add(e.target.files); e.target.value = "" }} />
        </div>

        <div className="space-y-3">
          {staged.items.map(item => (
            <StagedEmailCard key={item.key} item={item} locked={lockedLink(context)} disabled={staged.saving}
              onChange={change => staged.patch(item.key, change)} onRemove={() => staged.remove(item.key)} />
          ))}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={staged.saving} onClick={() => close(false)}>Cancel</Button>
          <Button type="button" disabled={staged.saving || staged.pendingCount === 0} onClick={save} className="gap-1.5">
            {staged.saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {staged.pendingCount > 1 ? `File ${staged.pendingCount} emails` : "File email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
