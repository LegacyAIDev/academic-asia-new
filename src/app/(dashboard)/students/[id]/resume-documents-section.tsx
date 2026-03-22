"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Loader2, FileUp, Trash2, Download } from "lucide-react"
import { uploadStudentDocument, deleteStudentDocument, getDocumentSignedUrl } from "@/lib/supabase/actions/student-documents"
import type { StudentDocumentRecord } from "@/lib/supabase/queries/student-resume-profile"

type Props = {
  studentId: string
  documents: StudentDocumentRecord[]
  categoryId: number
  title: string
}

function formatSize(bytes: number | null) {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export function ResumeDocumentsSection({ studentId, documents, categoryId, title }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await uploadStudentDocument({
        student_id: studentId,
        category_id: categoryId,
        title: (fd.get("title") as string) || null,
        description: (fd.get("description") as string) || null,
        academic_year: (fd.get("academic_year") as string) || null,
      }, fd)
      if (result?.success) setShowForm(false)
      else setError(result?.error ?? "Upload failed")
    })
  }

  const handleDelete = (docId: string) => {
    startTransition(async () => {
      await deleteStudentDocument(docId, studentId)
    })
  }

  const handleDownload = async (filePath: string) => {
    const result = await getDocumentSignedUrl(filePath)
    if (result.success && result.data?.url) {
      window.open(result.data.url, "_blank")
    }
  }

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
          {documents.length > 0 && <Badge variant="secondary" className="text-xs">{documents.length}</Badge>}
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3" /> Upload
        </Button>
      </div>

      {documents.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-2">No documents uploaded</p>
      )}

      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center gap-3 text-sm bg-background rounded-lg p-3 border border-border/50">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{doc.title || doc.file_name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {doc.description && <span>{doc.description}</span>}
              {doc.academic_year && <span>· {doc.academic_year}</span>}
              <span>· {formatSize(doc.file_size)}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDownload(doc.file_path)}>
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(doc.id)} disabled={isPending}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      {showForm && (
        <form onSubmit={handleUpload} className="bg-background rounded-lg p-4 border border-border/50 space-y-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">File</Label>
            <Input name="file" type="file" className="h-9 text-sm" accept="application/pdf,image/*" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{categoryId === 1 ? "Description" : "Public Exams"}</Label>
              <Input name="title" className="h-9 text-sm" placeholder={categoryId === 1 ? "Report description" : "Exam name"} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{categoryId === 1 ? "Remarks" : "Results"}</Label>
              <Input name="description" className="h-9 text-sm" placeholder={categoryId === 1 ? "Additional notes" : "Results achieved"} />
            </div>
          </div>
          {categoryId === 2 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date Taken</Label>
              <Input name="academic_year" className="h-9 text-sm" placeholder="e.g. 2025" />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={isPending} className="gap-1">
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileUp className="h-3 w-3" />} Upload
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
