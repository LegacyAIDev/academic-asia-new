"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AttachmentField } from "@/components/features/attachment-field"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"

export type ExamAccessDocs = { studentId: string; examId: string; files: AttachmentRecord[] }

/**
 * One candidate's own documents for an exam, such as the access code a school
 * sends for an online test: uploaded here, opened and printed from here. The
 * exam team only, like the papers.
 */
export function ExamAccessDocsDialog({ docs, studentName, open, onOpenChange }: {
  docs: ExamAccessDocs
  studentName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Access document · {studentName}</DialogTitle>
          <DialogDescription>
            A document a school sends for this student only, such as the code for an online test. Open it here to print it on the day.
          </DialogDescription>
        </DialogHeader>
        <AttachmentField attachPoint="student_exam_access" ownerId={docs.studentId} attachableId={docs.examId} attachments={docs.files} canWrite />
      </DialogContent>
    </Dialog>
  )
}
