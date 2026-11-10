"use client"

import { useState } from "react"
import { Panel, PanelEmpty } from "@/components/ui/panel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ResumeDialog, EditResumeButton, DeleteResumeButton } from "./resume-dialog"
import type { ResumeWithJoins } from "@/lib/supabase/queries/student-resume"
import type { ResumeReferenceData } from "./resume-dialog"
import type { AttachmentRecord } from "@/lib/supabase/queries/record-attachments"

type StudentResumeSectionProps = {
  studentId: string
  resumeEntries: ResumeWithJoins[]
  referenceData: ResumeReferenceData
  attachmentsByResume?: Map<string, AttachmentRecord[]>
  canWrite?: boolean
}

/** Color map for resume type badges */
const resumeTypeStyles: Record<string, string> = {
  music_audition: "bg-violet-50 text-violet-700 border-violet-200",
  top_schools: "bg-blue-50 text-blue-700 border-blue-200",
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

export function StudentResumeSection({
  studentId,
  resumeEntries,
  referenceData,
  attachmentsByResume,
  canWrite = true,
}: StudentResumeSectionProps) {
  const [filter, setFilter] = useState<string>("all")

  const filtered = filter === "all"
    ? resumeEntries
    : resumeEntries.filter(r => r.resume_type?.code === filter)

  if (resumeEntries.length === 0) {
    return (
      <Panel title="Auditions and school records">
        <PanelEmpty title="No records yet" action={canWrite ? <ResumeDialog studentId={studentId} referenceData={referenceData} mode="create" /> : null}>
          Music auditions and results at top schools, for the student&apos;s resume.
        </PanelEmpty>
      </Panel>
    )
  }

  const musicCount = resumeEntries.filter(r => r.resume_type?.code === "music_audition").length
  const schoolCount = resumeEntries.filter(r => r.resume_type?.code === "top_schools").length

  return (
    <Panel
      title="Auditions and school records"
      count={resumeEntries.length}
      flush
      action={
        <>
          {musicCount > 0 && schoolCount > 0 && (
            <div className="flex gap-1" role="group" aria-label="Show">
              {([["all", "All"], ["music_audition", "Music auditions"], ["top_schools", "Top schools"]] as const).map(([value, label]) => (
                <Button key={value} variant={filter === value ? "secondary" : "ghost"} size="sm" className="h-8 text-xs" aria-pressed={filter === value} onClick={() => setFilter(value)}>
                  {label}
                </Button>
              ))}
            </div>
          )}
          {canWrite && <ResumeDialog studentId={studentId} referenceData={referenceData} mode="create" />}
        </>
      }
    >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4 min-w-[120px]">Type</TableHead>
                <TableHead className="min-w-[120px]">Instrument</TableHead>
                <TableHead className="min-w-[100px]">Subject</TableHead>
                <TableHead className="min-w-[160px]">Qualification</TableHead>
                <TableHead className="min-w-[120px]">Piece</TableHead>
                <TableHead className="min-w-[100px]">Composer</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="min-w-[160px]">Event</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => {
                const typeStyle = resumeTypeStyles[entry.resume_type?.code ?? ""] ?? "bg-slate-50 text-slate-700 border-slate-200"

                return (
                  <TableRow key={entry.id}>
                    <TableCell className="pl-4">
                      {entry.resume_type ? (
                        <Badge variant="outline" className={`${typeStyle} border text-xs font-medium whitespace-nowrap`}>
                          {entry.resume_type.label}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{entry.instrument?.label ?? "—"}</TableCell>
                    <TableCell className="text-sm">{entry.subject || "—"}</TableCell>
                    <TableCell className="text-sm">{entry.qualification || "—"}</TableCell>
                    <TableCell className="text-sm max-w-[160px] truncate">{entry.piece || "—"}</TableCell>
                    <TableCell className="text-sm">{entry.composer || "—"}</TableCell>
                    <TableCell className="text-sm">{entry.priority ?? "—"}</TableCell>
                    <TableCell className="text-sm max-w-[160px] truncate">{entry.event_name || "—"}</TableCell>
                    <TableCell className="text-sm">{formatDate(entry.updated_at)}</TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <EditResumeButton
                          resume={entry}
                          studentId={studentId}
                          referenceData={referenceData}
                          attachments={attachmentsByResume?.get(entry.id) ?? []}
                          canWrite={canWrite}
                        />
                        {canWrite && (
                          <DeleteResumeButton
                            resumeId={entry.id}
                            studentId={studentId}
                            resumeLabel={entry.instrument?.label ?? entry.subject ?? "this entry"}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
    </Panel>
  )
}
