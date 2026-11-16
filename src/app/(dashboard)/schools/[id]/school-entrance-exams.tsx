"use client"

import { useState } from "react"
import { Panel, PanelEmpty } from "@/components/ui/panel"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Paperclip } from "lucide-react"
import { EntranceExamDialog, DeleteEntranceExamButton } from "./entrance-exam-dialog"
import type { SchoolEntranceExamWithJoins } from "@/lib/supabase/queries/school-entrance-exams"
import type { EntranceExamReferenceData } from "./entrance-exam-dialog"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"

type SchoolEntranceExamsSectionProps = {
  schoolId: string
  exams: SchoolEntranceExamWithJoins[]
  referenceData: EntranceExamReferenceData
  attachmentsByExam?: Map<string, AttachmentRecord[]>
  canWrite?: boolean
  canManagePapers?: boolean
}


export function SchoolEntranceExamsSection({
  schoolId,
  exams,
  referenceData,
  attachmentsByExam,
  canWrite = true,
  canManagePapers = false,
}: SchoolEntranceExamsSectionProps) {
  // The exam whose details are open in the drawer.
  const [openId, setOpenId] = useState<string | null>(null)
  const openExam = exams.find(exam => exam.id === openId) ?? null

  if (exams.length === 0) {
    return (
      <Panel title="Entrance exams">
        <PanelEmpty title="No entrance exams recorded" action={canWrite && <EntranceExamDialog schoolId={schoolId} referenceData={referenceData} mode="create" canManagePapers={canManagePapers} />}>
          Add entrance exam information for this school
        </PanelEmpty>
      </Panel>
    )
  }

  return (
    <Panel title="Entrance exams" flush action={<>{canWrite && <EntranceExamDialog schoolId={schoolId} referenceData={referenceData} mode="create" canManagePapers={canManagePapers} />}</>}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4 min-w-[100px]">Entry Year</TableHead>
                <TableHead className="min-w-[120px]">Exam Type</TableHead>
                <TableHead className="min-w-[100px]">Year Level</TableHead>
                <TableHead className="min-w-[180px]">Subject</TableHead>
                <TableHead className="min-w-[80px]">Duration</TableHead>
                <TableHead className="min-w-[160px]">Paper</TableHead>
                {canWrite && <TableHead className="w-[1%] pr-4"><span className="sr-only">Delete</span></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map((exam) => (
                // The whole row opens the exam's details; the entry year is the keyboard target.
                <TableRow key={exam.id} className="cursor-pointer" onClick={() => setOpenId(exam.id)}>
                  <TableCell className="pl-4 font-medium text-sm">
                    <button type="button" className="text-left hover:text-brand-navy focus-visible:outline-none focus-visible:underline"
                      aria-label={`Open entrance exam: ${[exam.subject, exam.year_level, exam.entry_year].filter(Boolean).join(", ")}`}
                      onClick={event => { event.stopPropagation(); setOpenId(exam.id) }}>
                      {exam.entry_year || "—"}
                    </button>
                  </TableCell>
                  <TableCell>
                    {exam.exam_type
                      ? <Badge variant="outline" className="whitespace-nowrap text-xs font-medium">{exam.exam_type.label}</Badge>
                      : <span className="text-sm text-muted-foreground/60">Not set</span>}
                  </TableCell>
                  <TableCell className="text-sm">{exam.year_level || "—"}</TableCell>
                  <TableCell className="text-sm">
                    <div>
                      <span>{exam.subject || "—"}</span>
                      {exam.exam_format && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {exam.exam_format}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {exam.duration_minutes ? `${exam.duration_minutes} min` : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {/* In words: a paper held in the office, files attached, or one to request from the school. */}
                    <PaperStatus
                      inOffice={exam.has_paper}
                      onRequest={exam.paper_request_from_school}
                      files={attachmentsByExam?.get(exam.id) ?? []}
                    />
                  </TableCell>
                  {canWrite && (
                    <TableCell className="pr-4" onClick={event => event.stopPropagation()}>
                      <DeleteEntranceExamButton examId={exam.id} schoolId={schoolId} label={exam.subject || "this exam"} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {openExam && (
          <EntranceExamDialog
            key={openExam.id}
            mode="edit"
            exam={openExam}
            schoolId={schoolId}
            referenceData={referenceData}
            attachments={attachmentsByExam?.get(openExam.id) ?? []}
            canWrite={canWrite}
            canManagePapers={canManagePapers}
            trigger={null}
            open
            onOpenChange={open => { if (!open) setOpenId(null) }}
          />
        )}
      </Panel>
  )
}

/** Where the paper is, said plainly: "Paper in the office", "english-v3.pdf", "Ask the school for it". */
function PaperStatus({ inOffice, onRequest, files }: { inOffice: boolean | null; onRequest: boolean | null; files: AttachmentRecord[] }) {
  const parts: React.ReactNode[] = []
  if (files.length === 1) parts.push(<span key="f" className="flex items-center gap-1"><Paperclip className="h-3 w-3 shrink-0" aria-hidden="true" /><span className="truncate">{files[0].title || files[0].file_name || "Attached file"}</span></span>)
  if (files.length > 1) parts.push(<span key="f" className="flex items-center gap-1"><Paperclip className="h-3 w-3 shrink-0" aria-hidden="true" />{files.length} files attached</span>)
  if (inOffice) parts.push(<span key="o">Paper in the office</span>)
  if (onRequest) parts.push(<span key="r" className="text-amber-700">Ask the school for it</span>)
  if (parts.length === 0) return <span className="text-muted-foreground/60">No paper yet</span>
  return <div className="max-w-[220px] space-y-0.5 text-muted-foreground">{parts}</div>
}
