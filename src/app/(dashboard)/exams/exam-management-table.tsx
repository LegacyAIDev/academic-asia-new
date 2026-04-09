"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { updateExamFields } from "@/lib/supabase/actions/student-individual-exams"
import type { ExamManagementRecord } from "@/lib/supabase/queries/exam-management"

type Props = {
  exams: ExamManagementRecord[]
  currentStatus?: number
  page: number
  totalPages: number
  totalCount: number
}

const statusMap: Record<number, { label: string; style: string }> = {
  1: { label: "Pending", style: "bg-amber-50 text-amber-700 border-amber-200" },
  2: { label: "Confirmed", style: "bg-blue-50 text-blue-700 border-blue-200" },
  3: { label: "Completed", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
}

const tabs = [
  { label: "All", value: undefined },
  { label: "Pending", value: 1 },
  { label: "Confirmed", value: 2 },
  { label: "Completed", value: 3 },
]

function buildUrl(status?: number, page?: number) {
  const params = new URLSearchParams()
  if (status) params.set("status", status.toString())
  if (page && page > 1) params.set("page", page.toString())
  const qs = params.toString()
  return qs ? `/exams?${qs}` : "/exams"
}

export function ExamManagementTable({ exams, currentStatus, page, totalPages, totalCount }: Props) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="border-b bg-muted/30 px-6 py-3">
        <div className="flex items-center gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.label}
              variant={currentStatus === tab.value ? "default" : "ghost"}
              size="sm"
              className="h-8 text-xs"
              asChild
            >
              <Link href={buildUrl(tab.value)}>
                {tab.label}
              </Link>
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/20">
              <TableHead className="pl-6 min-w-[180px]">Student</TableHead>
              <TableHead className="min-w-[100px]">Type</TableHead>
              <TableHead className="min-w-[100px]">Subject</TableHead>
              <TableHead className="min-w-[60px]">Year</TableHead>
              <TableHead className="min-w-[120px]">Preferred</TableHead>
              <TableHead className="min-w-[130px]">Confirmed Date</TableHead>
              <TableHead className="min-w-[100px]">Time</TableHead>
              <TableHead className="min-w-[90px]">Room</TableHead>
              <TableHead className="min-w-[70px]">Seat</TableHead>
              <TableHead className="min-w-[80px]">Score</TableHead>
              <TableHead className="min-w-[80px] pr-6">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                  No exams found for this filter.
                </TableCell>
              </TableRow>
            ) : (
              exams.map((exam) => (
                <ExamRow key={exam.id} exam={exam} />
              ))
            )}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{exams.length}</span> of <span className="font-medium">{totalCount.toLocaleString()}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
                {page > 1 ? <Link href={buildUrl(currentStatus, page - 1)}>Previous</Link> : <>Previous</>}
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} asChild={page < totalPages}>
                {page < totalPages ? <Link href={buildUrl(currentStatus, page + 1)}>Next</Link> : <>Next</>}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ExamRow({ exam }: { exam: ExamManagementRecord }) {
  const [isPending, startTransition] = useTransition()
  const [localStatus, setLocalStatus] = useState(exam.status_id)
  const status = statusMap[localStatus] ?? statusMap[1]
  const studentName = [exam.student?.first_name, exam.student?.surname].filter(Boolean).join(" ")

  const isPendingStatus = localStatus === 1
  const isConfirmedStatus = localStatus === 2
  const isCompleted = localStatus === 3

  const handleFieldSave = (field: string, value: string) => {
    startTransition(async () => {
      const input: Record<string, string | number | null> = {}
      if (field === "score" || field === "seat_no") {
        input[field] = value ? Number(value) : null
      } else {
        input[field] = value || null
      }
      const result = await updateExamFields(exam.id, input)
      if (result.success) {
        toast.success("Updated")
        // Local status will refresh on revalidation — no optimistic update needed
        // since both date AND time are required for status change
      } else {
        toast.error(result.error ?? "Failed to update")
      }
    })
  }

  const formatDate = (d: string | null) => {
    if (!d) return "—"
    return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  }

  return (
    <TableRow className={isPending ? "opacity-50" : ""}>
      <TableCell className="pl-6">
        <div>
          <Link href={`/students/${exam.student_id}`} className="text-sm font-medium hover:text-primary transition-colors">
            {studentName || "—"}
          </Link>
          {exam.student?.student_code && (
            <code className="block text-[10px] text-muted-foreground font-mono">{exam.student.student_code}</code>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-xs">{exam.exam_type?.label ?? "—"}</Badge>
      </TableCell>
      <TableCell className="text-sm">{exam.subject || "—"}</TableCell>
      <TableCell className="text-sm">{exam.apply_year || "—"}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(exam.preferred_date)}
        {exam.preferred_start_time && <span className="ml-1">{exam.preferred_start_time.slice(0, 5)}</span>}
      </TableCell>
      <TableCell>
        {isPendingStatus ? (
          <Input type="date" className="h-8 text-xs w-[130px]" defaultValue={exam.confirmed_date ?? ""}
            onBlur={(e) => handleFieldSave("confirmed_date", e.target.value)} />
        ) : (
          <span className="text-sm">{formatDate(exam.confirmed_date)}</span>
        )}
      </TableCell>
      <TableCell>
        {isPendingStatus ? (
          <Input type="time" className="h-8 text-xs w-[90px]" defaultValue={exam.confirmed_start_time ?? ""}
            onBlur={(e) => handleFieldSave("confirmed_start_time", e.target.value)} />
        ) : (
          <span className="text-sm">{exam.confirmed_start_time ?? "—"}</span>
        )}
      </TableCell>
      <TableCell>
        {!isCompleted ? (
          <Input className="h-8 text-xs w-[80px]" defaultValue={exam.room ?? ""} placeholder="Room"
            onBlur={(e) => handleFieldSave("room", e.target.value)} />
        ) : (
          <span className="text-sm">{exam.room || "—"}</span>
        )}
      </TableCell>
      <TableCell>
        {!isCompleted ? (
          <Input type="number" className="h-8 text-xs w-[60px]" defaultValue={exam.seat_no?.toString() ?? ""} placeholder="#"
            onBlur={(e) => handleFieldSave("seat_no", e.target.value)} />
        ) : (
          <span className="text-sm">{exam.seat_no ?? "—"}</span>
        )}
      </TableCell>
      <TableCell>
        {isConfirmedStatus ? (
          <Input type="number" className="h-8 text-xs w-[70px]" defaultValue={exam.score?.toString() ?? ""} placeholder="Score"
            onBlur={(e) => handleFieldSave("score", e.target.value)} />
        ) : (
          <span className="text-sm font-medium">{exam.score ?? "—"}</span>
        )}
      </TableCell>
      <TableCell className="pr-6">
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : (
          <Badge variant="outline" className={`${status.style} border text-xs`}>{status.label}</Badge>
        )}
      </TableCell>
    </TableRow>
  )
}
