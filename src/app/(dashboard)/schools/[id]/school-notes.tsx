"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StickyNote } from "lucide-react"
import { NoteDialog, EditNoteButton, DeleteNoteButton } from "./note-dialog"
import type { SchoolNoteWithJoins } from "@/lib/supabase/queries/school-notes"
import type { NoteReferenceData } from "./note-dialog"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"

type SchoolNotesSectionProps = {
  schoolId: string
  notes: SchoolNoteWithJoins[]
  referenceData: NoteReferenceData
  attachmentsByNote?: Map<string, AttachmentRecord[]>
  canWrite?: boolean
}

/** Category badge color based on category code */
const categoryStyles: Record<string, string> = {
  school: "bg-blue-50 text-blue-700 border-blue-200",
  academic: "bg-indigo-50 text-indigo-700 border-indigo-200",
  al_subjects: "bg-violet-50 text-violet-700 border-violet-200",
  accommodation: "bg-amber-50 text-amber-700 border-amber-200",
  sports: "bg-green-50 text-green-700 border-green-200",
  activities: "bg-teal-50 text-teal-700 border-teal-200",
  music: "bg-pink-50 text-pink-700 border-pink-200",
  application_procedure: "bg-orange-50 text-orange-700 border-orange-200",
  aa_only: "bg-rose-50 text-rose-700 border-rose-200",
  scholarship: "bg-emerald-50 text-emerald-700 border-emerald-200",
}

export function SchoolNotesSection({
  schoolId,
  notes,
  referenceData,
  attachmentsByNote,
  canWrite = true,
}: SchoolNotesSectionProps) {
  if (notes.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-muted-foreground" />
              Notes
            </CardTitle>
            <NoteDialog schoolId={schoolId} referenceData={referenceData} mode="create" />
          </div>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <StickyNote className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">No notes recorded</h3>
            <p className="text-sm text-muted-foreground">
              Add notes and information for this school
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-muted-foreground" />
            Notes ({notes.length})
          </CardTitle>
          <NoteDialog schoolId={schoolId} referenceData={referenceData} mode="create" />
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 min-w-[150px]">Category</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.map((note) => {
                const badgeStyle = categoryStyles[note.category?.code ?? ""] ?? "bg-slate-50 text-slate-700 border-slate-200"
                return (
                  <TableRow key={note.id}>
                    <TableCell className="pl-6">
                      <Badge variant="outline" className={`${badgeStyle} border text-xs font-medium whitespace-nowrap`}>
                        {note.category?.label ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <p className="text-muted-foreground line-clamp-2 max-w-[500px]">
                        {note.detail || "—"}
                      </p>
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <EditNoteButton
                          note={note}
                          schoolId={schoolId}
                          referenceData={referenceData}
                          attachments={attachmentsByNote?.get(note.id) ?? []}
                          canWrite={canWrite}
                        />
                        <DeleteNoteButton
                          noteId={note.id}
                          schoolId={schoolId}
                          label={note.category?.label || "this note"}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
