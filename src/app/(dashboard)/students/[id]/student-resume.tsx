"use client"

import { useState } from "react"
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
import { FileText } from "lucide-react"
import { ResumeDialog, EditResumeButton, DeleteResumeButton } from "./resume-dialog"
import type { ResumeWithJoins } from "@/lib/supabase/queries/student-resume"
import type { ResumeReferenceData } from "./resume-dialog"

type StudentResumeSectionProps = {
  studentId: string
  resumeEntries: ResumeWithJoins[]
  referenceData: ResumeReferenceData
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
}: StudentResumeSectionProps) {
  const [filter, setFilter] = useState<string>("all")

  const filtered = filter === "all"
    ? resumeEntries
    : resumeEntries.filter(r => r.resume_type?.code === filter)

  if (resumeEntries.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Resume
            </CardTitle>
            <ResumeDialog studentId={studentId} referenceData={referenceData} mode="create" />
          </div>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">No resume entries yet</h3>
            <p className="text-sm text-muted-foreground">
              Add music audition or school records for this student
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const musicCount = resumeEntries.filter(r => r.resume_type?.code === "music_audition").length
  const schoolCount = resumeEntries.filter(r => r.resume_type?.code === "top_schools").length

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Resume ({resumeEntries.length})
            </CardTitle>
            <div className="flex gap-1.5">
              <Badge
                variant={filter === "all" ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setFilter("all")}
              >
                All ({resumeEntries.length})
              </Badge>
              {musicCount > 0 && (
                <Badge
                  variant={filter === "music_audition" ? "default" : "outline"}
                  className={`cursor-pointer text-xs ${filter !== "music_audition" ? resumeTypeStyles.music_audition : ""}`}
                  onClick={() => setFilter(filter === "music_audition" ? "all" : "music_audition")}
                >
                  Music Audition ({musicCount})
                </Badge>
              )}
              {schoolCount > 0 && (
                <Badge
                  variant={filter === "top_schools" ? "default" : "outline"}
                  className={`cursor-pointer text-xs ${filter !== "top_schools" ? resumeTypeStyles.top_schools : ""}`}
                  onClick={() => setFilter(filter === "top_schools" ? "all" : "top_schools")}
                >
                  Top Schools ({schoolCount})
                </Badge>
              )}
            </div>
          </div>
          <ResumeDialog studentId={studentId} referenceData={referenceData} mode="create" />
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 min-w-[120px]">Type</TableHead>
                <TableHead className="min-w-[120px]">Instrument</TableHead>
                <TableHead className="min-w-[100px]">Subject</TableHead>
                <TableHead className="min-w-[160px]">Qualification</TableHead>
                <TableHead className="min-w-[120px]">Piece</TableHead>
                <TableHead className="min-w-[100px]">Composer</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="min-w-[160px]">Event</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => {
                const typeStyle = resumeTypeStyles[entry.resume_type?.code ?? ""] ?? "bg-slate-50 text-slate-700 border-slate-200"

                return (
                  <TableRow key={entry.id}>
                    <TableCell className="pl-6">
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
                    <TableCell className="pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <EditResumeButton
                          resume={entry}
                          studentId={studentId}
                          referenceData={referenceData}
                        />
                        <DeleteResumeButton
                          resumeId={entry.id}
                          studentId={studentId}
                          resumeLabel={entry.instrument?.label ?? entry.subject ?? "this entry"}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <div className="px-6 py-3 border-t text-xs text-muted-foreground">
          {filter !== "all"
            ? `Showing ${filtered.length} of ${resumeEntries.length} entries`
            : `Total: ${resumeEntries.length} entr${resumeEntries.length !== 1 ? "ies" : "y"}`
          }
        </div>
      </CardContent>
    </Card>
  )
}
