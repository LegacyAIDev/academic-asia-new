"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { FileText, Pencil, Check, Loader2, Download, Trash2, Plus, FileUp } from "lucide-react"
import { toast } from "sonner"
import { updateStudent } from "@/lib/supabase/actions/students"
import { uploadStudentDocument, deleteStudentDocument, getDocumentSignedUrl } from "@/lib/supabase/actions/student-documents"
import type { StudentDocumentRecord } from "@/lib/supabase/queries/student-resume-profile"

type Props = {
  studentId: string
  passportType: string | null
  passportNumber: string | null
  documents: StudentDocumentRecord[]
}

/** Legal documents section — passport info + document uploads */
export function StudentLegalDocumentsSection({ studentId, passportType, passportNumber, documents }: Props) {
  const [editing, setEditing] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handlePassportSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateStudent(studentId, {
        passport_type: (fd.get("passport_type") as string) || null,
        passport_number: (fd.get("passport_number") as string) || null,
      })
      if (result.success) {
        toast.success("Passport info updated")
        setEditing(false)
      } else {
        toast.error(result.error ?? "Failed to update")
      }
    })
  }

  const handleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await uploadStudentDocument({
        student_id: studentId,
        category_code: 'passport_copy',
        title: (fd.get("title") as string) || null,
        description: (fd.get("description") as string) || null,
      }, fd)
      if (result?.success) {
        toast.success("Document uploaded")
        setShowUpload(false)
      } else {
        toast.error(result?.error ?? "Upload failed")
      }
    })
  }

  const handleDelete = (docId: string) => {
    startTransition(async () => {
      await deleteStudentDocument(docId, studentId)
      toast.success("Document removed")
    })
  }

  const handleDownload = async (filePath: string) => {
    const result = await getDocumentSignedUrl(filePath)
    if (result.success && result.data?.url) window.open(result.data.url, "_blank")
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Legal Documents
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowUpload(!showUpload)}>
              <Plus className="h-3 w-3" /> Upload
            </Button>
            {!editing && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Passport Info */}
        {editing ? (
          <form onSubmit={handlePassportSave} className="rounded-lg border border-border p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Passport Type</Label>
                <Select name="passport_type" defaultValue={passportType ?? ""}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HKSAR">HKSAR</SelectItem>
                    <SelectItem value="BNO">BNO</SelectItem>
                    <SelectItem value="China">China</SelectItem>
                    <SelectItem value="UK">UK</SelectItem>
                    <SelectItem value="US">US</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Passport Number</Label>
                <Input name="passport_number" className="h-9 text-sm" defaultValue={passportNumber ?? ""} placeholder="e.g. H12345678" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isPending} className="gap-1">
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Passport Type</p>
              <p className="text-sm font-medium">{passportType || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Passport Number</p>
              <p className="text-sm font-medium">{passportNumber || "—"}</p>
            </div>
          </div>
        )}

        {/* Document Upload Form */}
        {showUpload && (
          <form onSubmit={handleUpload} className="rounded-lg border border-border p-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">File</Label>
              <Input name="file" type="file" className="h-9 text-sm" accept="application/pdf,image/*" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Title</Label>
                <Input name="title" className="h-9 text-sm" placeholder="e.g. Passport Copy" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Input name="description" className="h-9 text-sm" placeholder="Additional notes" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowUpload(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isPending} className="gap-1">
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileUp className="h-3 w-3" />} Upload
              </Button>
            </div>
          </form>
        )}

        {/* Uploaded Documents */}
        {documents.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Documents ({documents.length})
            </p>
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 text-sm bg-muted/30 rounded-lg p-3 border border-border/50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{doc.title || doc.file_name}</p>
                  {doc.description && <p className="text-xs text-muted-foreground">{doc.description}</p>}
                </div>
                {doc.category && (
                  <Badge variant="outline" className="text-xs shrink-0">{doc.category.label}</Badge>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDownload(doc.file_path)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(doc.id)} disabled={isPending}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {documents.length === 0 && !showUpload && (
          <p className="text-sm text-muted-foreground text-center py-2">No documents uploaded</p>
        )}
      </CardContent>
    </Card>
  )
}
