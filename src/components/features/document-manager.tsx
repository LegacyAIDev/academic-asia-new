"use client"

import { useEffect, useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { FileText, FileUp, Loader2, Trash2, Download, X, Check, Pencil } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

type Category = { id: number; code: string; label: string }
type Staged = { file: File; name: string; categoryId: string }

/** Minimal shape shared by student_documents and school_documents rows. */
export type ManagedDocument = {
  id: string
  file_name: string
  file_size: number | null
  title: string | null
  category: { id: number; code: string; label: string } | null
}

type BatchResult = { uploaded: number; failed: number; errors: string[] }
type ActionResult<T = unknown> = { success: boolean; data?: T; error?: string }

type DocumentManagerProps = {
  ownerId: string
  documents: ManagedDocument[]
  /** Restrict the category picker to these document_categories.section values. */
  categorySections?: string[]
  uploadAction: (ownerId: string, items: { category_id: number; title: string | null }[], formData: FormData) => Promise<ActionResult<BatchResult>>
  renameAction: (docId: string, ownerId: string, title: string) => Promise<ActionResult>
  deleteAction: (docId: string, ownerId: string) => Promise<ActionResult>
  signedUrlAction: (filePath: string) => Promise<ActionResult<{ url: string }>>
  /** Passed to signedUrlAction — the stored path for a document. */
  getFilePath: (doc: ManagedDocument) => string
}

function formatSize(bytes: number | null) {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

/** Reusable multi-file document manager: staged upload with per-file name +
 *  category, plus rename / download / delete of existing documents. */
export function DocumentManager({
  ownerId, documents, categorySections,
  uploadAction, renameAction, deleteAction, signedUrlAction, getFilePath,
}: DocumentManagerProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [staged, setStaged] = useState<Staged[]>([])
  const [isPending, startTransition] = useTransition()
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  useEffect(() => {
    let query = createClient()
      .from("document_categories")
      .select("id, code, label, section")
      .order("sort_order")
    if (categorySections && categorySections.length > 0) {
      query = query.in("section", categorySections)
    }
    query.then(({ data }) => { if (data) setCategories(data as Category[]) })
  }, [categorySections])

  const defaultCategoryId = () =>
    (categories.find((c) => c.code === "other") ?? categories[0])?.id.toString() ?? ""

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const next = Array.from(files).map((file) => ({
      file, name: file.name.replace(/\.[^.]+$/, ""), categoryId: defaultCategoryId(),
    }))
    setStaged((prev) => [...prev, ...next])
  }

  const patchStaged = (i: number, patch: Partial<Staged>) =>
    setStaged((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))

  const uploadAll = () => {
    if (staged.length === 0) return
    const fd = new FormData()
    const items = staged.map((s, i) => {
      fd.append(`file_${i}`, s.file)
      return { category_id: parseInt(s.categoryId, 10), title: s.name || null }
    })
    startTransition(async () => {
      const result = await uploadAction(ownerId, items, fd)
      if (result.success && result.data) {
        const { uploaded, failed, errors } = result.data
        if (uploaded > 0) toast.success(`Uploaded ${uploaded} document${uploaded === 1 ? "" : "s"}`)
        if (failed > 0) toast.error(errors[0] ?? `${failed} file(s) failed`)
        setStaged([])
      } else {
        toast.error(result.error ?? "Upload failed")
      }
    })
  }

  const saveRename = (docId: string) => {
    startTransition(async () => {
      const result = await renameAction(docId, ownerId, renameValue)
      if (result.success) { setRenamingId(null); toast.success("Renamed") }
      else toast.error(result.error ?? "Rename failed")
    })
  }

  const handleDelete = (docId: string) => {
    startTransition(async () => { await deleteAction(docId, ownerId) })
  }

  const handleDownload = async (doc: ManagedDocument) => {
    const result = await signedUrlAction(getFilePath(doc))
    if (result.success && result.data?.url) window.open(result.data.url, "_blank")
    else toast.error("Could not open document")
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Documents
          {documents.length > 0 && <Badge variant="secondary" className="text-xs">{documents.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center transition-colors hover:bg-muted/40">
          <FileUp className="h-6 w-6 text-muted-foreground" />
          <span className="text-sm font-medium">Choose files or drop them here</span>
          <span className="text-xs text-muted-foreground">PDF or images, up to 10 MB each — select multiple</span>
          <input type="file" multiple accept="application/pdf,image/*" className="hidden"
            onChange={(e) => { addFiles(e.target.files); e.target.value = "" }} />
        </label>

        {staged.length > 0 && (
          <div className="space-y-2 rounded-xl border border-border bg-background p-3">
            {staged.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={s.name} onChange={(e) => patchStaged(i, { name: e.target.value })}
                  placeholder={s.file.name} className="h-9 flex-1 text-sm" />
                <Select value={s.categoryId} onValueChange={(v) => patchStaged(i, { categoryId: v })}>
                  <SelectTrigger className="h-9 w-[190px] text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (<SelectItem key={c.id} value={c.id.toString()}>{c.label}</SelectItem>))}
                  </SelectContent>
                </Select>
                <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">{formatSize(s.file.size)}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                  onClick={() => setStaged((prev) => prev.filter((_, idx) => idx !== i))}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setStaged([])} disabled={isPending}>Clear</Button>
              <Button size="sm" onClick={uploadAll} disabled={isPending} className="gap-1.5">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                Upload {staged.length} file{staged.length === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        )}

        {documents.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No documents uploaded yet.</p>
        ) : (
          groupByCategory(documents).map(([label, docs]) => (
            <div key={label} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-background p-3 text-sm">
                  {renamingId === doc.id ? (
                    <>
                      <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="h-8 flex-1 text-sm" autoFocus />
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-emerald-600" onClick={() => saveRename(doc.id)} disabled={isPending}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setRenamingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{doc.title || doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">{formatSize(doc.file_size)}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                        onClick={() => { setRenamingId(doc.id); setRenameValue(doc.title || doc.file_name) }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDownload(doc)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(doc.id)} disabled={isPending}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function groupByCategory(documents: ManagedDocument[]): [string, ManagedDocument[]][] {
  const map = new Map<string, ManagedDocument[]>()
  for (const doc of documents) {
    const label = doc.category?.label ?? "Other"
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(doc)
  }
  return Array.from(map.entries())
}
