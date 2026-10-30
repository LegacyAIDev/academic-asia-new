"use client"

import { useCallback, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { EMAIL_BUCKET, EMAIL_CONTENT_TYPES, emailFileProblem, emailSourceForFile, type EmailFileSource } from "@/lib/emails/email-files"
import { parseEmailFile } from "@/lib/emails/parse-email"
import {
  checkDraft, detailsInput, draftFromParsed, emptyDraft, linksInput, type EmailDraft, type LinkDraft,
} from "@/lib/emails/email-draft"
import { fileEmail, prepareEmailUpload } from "@/lib/supabase/actions/filed-emails"

/** How many emails one batch may hold (EF-03); more can be added after saving. */
export const MAX_BATCH = 20

export type StagedEmail = {
  key: string
  file: File
  source: EmailFileSource | null
  status: "reading" | "ready" | "saving" | "saved" | "error"
  /** A problem that blocks saving (wrong type, too big) or the last save failure. */
  error: string | null
  /** Information only, e.g. the details could not be pre-filled in the browser. */
  notice: string | null
  blocked: boolean
  draft: EmailDraft
  links: LinkDraft
  invalid: Partial<Record<keyof EmailDraft, boolean>>
  messageId: string | null
  attachmentNames: string[]
}

/**
 * The emails picked in the filing dialog, each with its own pre-filled form.
 * Saving goes one email at a time: get a one-time upload link, upload the file
 * straight to private storage, then ask the server to file it. A failure stays
 * on its card and the rest carry on.
 */
export function useStagedEmails(defaultLinks: LinkDraft) {
  const [items, setItems] = useState<StagedEmail[]>([])
  const [saving, setSaving] = useState(false)

  const patch = useCallback((key: string, change: Partial<StagedEmail>) => {
    setItems(list => list.map(item => (item.key === key ? { ...item, ...change } : item)))
  }, [])

  const read = useCallback(async (item: StagedEmail) => {
    if (item.source !== "eml" && item.source !== "msg") return
    try {
      const parsed = await parseEmailFile(await item.file.arrayBuffer(), item.source)
      patch(item.key, {
        status: "ready", draft: draftFromParsed(parsed), messageId: parsed.messageId,
        attachmentNames: parsed.attachments.map(a => a.fileName),
      })
    } catch {
      // The server reads the file again when it is filed and has the final say, so a
      // browser that cannot read it only loses the pre-filled details, not the upload.
      patch(item.key, {
        status: "ready",
        notice: "The details could not be read here. Fill them in; the file is checked again when you save.",
      })
    }
  }, [patch])

  const addFiles = useCallback((files: File[]) => {
    const room = Math.max(0, MAX_BATCH - items.filter(i => i.status !== "saved").length)
    const added = files.slice(0, room).map((file): StagedEmail => {
      const problem = emailFileProblem(file)
      const source = emailSourceForFile(file.name)
      const pdfDraft = { ...emptyDraft(), subject: file.name.replace(/\.pdf$/i, "") }
      return {
        key: crypto.randomUUID(), file, source,
        status: problem ? "error" : source === "pdf" ? "ready" : "reading",
        error: problem, notice: null, blocked: !!problem,
        draft: source === "pdf" ? pdfDraft : emptyDraft(),
        links: defaultLinks, invalid: {}, messageId: null, attachmentNames: [],
      }
    })
    setItems(list => [...list.filter(i => i.status !== "saved"), ...added])
    for (const item of added) if (!item.blocked) void read(item)
    return files.length - added.length
  }, [items, defaultLinks, read])

  const saveOne = async (item: StagedEmail): Promise<boolean> => {
    const check = checkDraft(item.draft, item.links)
    if (!check.ok) {
      patch(item.key, { status: "error", error: check.error, invalid: check.invalid })
      return false
    }
    patch(item.key, { status: "saving", error: null, invalid: {} })
    const links = linksInput(item.links)
    const fail = (error: string) => { patch(item.key, { status: "error", error }); return false }
    try {
      const prepared = await prepareEmailUpload({ links, fileName: item.file.name, size: item.file.size, messageId: item.messageId })
      if (!prepared.success || !prepared.data) return fail(prepared.error ?? "Could not start the upload")
      const { error: uploadError } = await createClient().storage.from(EMAIL_BUCKET)
        .uploadToSignedUrl(prepared.data.path, prepared.data.token, item.file, { contentType: EMAIL_CONTENT_TYPES[item.source!] })
      if (uploadError) return fail("The upload failed. Check your connection and try again.")
      const filed = await fileEmail({
        links, details: { ...detailsInput(item.draft), stagedPath: prepared.data.path, fileName: item.file.name },
      })
      if (!filed.success) return fail(filed.error ?? "Could not save the email")
      patch(item.key, { status: "saved", error: null })
      return true
    } catch {
      return fail("Could not save the email. Please try again.")
    }
  }

  const saveAll = async (): Promise<{ saved: number; failed: number }> => {
    setSaving(true)
    let saved = 0
    let failed = 0
    for (const item of items) {
      if (item.blocked || item.status === "saved" || item.status === "reading") continue
      if (await saveOne(item)) saved++
      else failed++
    }
    setSaving(false)
    return { saved, failed }
  }

  const remove = (key: string) => setItems(list => list.filter(i => i.key !== key))
  const reset = () => setItems([])
  const pending = items.filter(i => !i.blocked && i.status !== "saved")

  return { items, addFiles, patch, remove, reset, saveAll, saving, pendingCount: pending.length }
}
