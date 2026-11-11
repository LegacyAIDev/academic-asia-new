import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Panel } from "@/components/ui/panel"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BookingStatusBadge } from "@/components/scheduler/booking-status-badge"
import { RoomChip } from "@/components/scheduler/room-chip"
import { EXAM_DESK_STATUS_LABELS, examDeskActions, type ExamDeskRow } from "@/lib/exams/exam-desk-rows"
import { examsHref, nextSort, type ExamDeskSortKey, type SortDirection } from "@/lib/exams/exam-page-search-params"
import type { RawSearchParams } from "@/lib/scheduler/search-params"
import { formatHkDate, formatHkTime } from "@/lib/scheduler/time-utils"
import { ExamDeskRowActions } from "./exam-desk-row-actions"

type Props = {
  title: string
  subtitle: string
  countLabel: string
  emptyText: string
  rows: ExamDeskRow[]
  /** Current URL parameters, used to build sort links. */
  raw: RawSearchParams
  sort: ExamDeskSortKey
  dir: SortDirection
  /** Shows the date under the time when the desk covers more than one day. */
  showDate: boolean
  canWrite: boolean
  canOpenBooking: boolean
  canOpenStudent: boolean
  /** Exam team only: may open the paper files of a booking. */
  canPrintPapers: boolean
  /** Signed-in user, so each note's author can edit it; the desk itself needs Exams access to open. */
  currentUserId: string | null
}

const COLUMNS: { key: ExamDeskSortKey; label: string; className: string }[] = [
  { key: "time", label: "Time", className: "pl-4 w-[96px]" },
  { key: "student", label: "Student", className: "min-w-[160px]" },
  { key: "school", label: "School and entry", className: "min-w-[170px]" },
  { key: "assessment", label: "Assessment and papers", className: "min-w-[170px]" },
  { key: "room", label: "Room", className: "w-[130px]" },
  { key: "status", label: "Status", className: "w-[130px]" },
]

/** A long group exam would make its row taller than the screen, so only the first few names are listed. */
const MAX_NAMES = 5

const dash = <span className="text-muted-foreground">—</span>

/** One list of the exam desk (booked or showed up). Server-rendered; only the action buttons are interactive. */
export function ExamDeskTable(props: Props) {
  const { rows, raw, sort, dir, canWrite, canOpenBooking, canPrintPapers, currentUserId } = props
  // Everyone who sees the desk may print a cover slip, so the column appears as soon as a row has a candidate.
  const showActions = canWrite || canOpenBooking || canPrintPapers || rows.some(row => row.candidates.length > 0 || row.examId)

  return (
    <Panel
      title={<>{props.title} <span className="font-normal text-muted-foreground">{props.subtitle}</span></>}
      action={<Badge variant="outline" className="tabular-nums">{props.countLabel}</Badge>}
      flush
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-transparent">
              {COLUMNS.map(column => (
                <SortableTableHead
                  key={column.key}
                  label={column.label}
                  className={column.className}
                  href={examsHref(raw, nextSort({ sort, dir }, column.key))}
                  direction={sort === column.key ? dir : null}
                />
              ))}
              {showActions && <TableHead className="w-[1%] pr-4 text-right"><span className="sr-only">Actions</span></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUMNS.length + (showActions ? 1 : 0)} className="py-8 text-center text-muted-foreground">
                  {props.emptyText}
                </TableCell>
              </TableRow>
            )}
            {rows.map(row => (
              <TableRow key={row.rowKey}>
                <TableCell className="pl-4 align-top">
                  <span className="block font-medium tabular-nums">{formatHkTime(row.startAt)}–{formatHkTime(row.endAt)}</span>
                  {props.showDate && (
                    <span className="block text-xs text-muted-foreground tabular-nums">{formatHkDate(row.startAt)}</span>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  {row.candidates.length === 0 && dash}
                  {row.candidates.slice(0, MAX_NAMES).map(candidate => (
                    <div key={candidate.studentId} className="leading-tight [&:not(:first-child)]:mt-1.5">
                      {props.canOpenStudent ? (
                        <Link href={`/students/${candidate.studentId}`} className="text-sm font-medium transition-colors hover:text-primary">
                          {candidate.name}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium">{candidate.name}</span>
                      )}
                      {candidate.code && <code className="block font-mono text-[10px] text-muted-foreground">{candidate.code}</code>}
                    </div>
                  ))}
                  {row.candidates.length > MAX_NAMES && (
                    <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">+{row.candidates.length - MAX_NAMES} more</p>
                  )}
                </TableCell>
                <TableCell className="align-top text-sm">
                  {row.schoolName ?? <span className="text-muted-foreground/60">No school</span>}
                  {(row.yearLevels.length > 0 || row.entryYear) && (
                    <span className="block text-xs text-muted-foreground">
                      {[row.yearLevels.join(", "), row.entryYear ? `${row.entryYear} entry` : null].filter(Boolean).join(", ")}
                    </span>
                  )}
                </TableCell>
                <TableCell className="align-top text-sm">
                  {row.assessment ?? <span className="text-muted-foreground/60">Not set</span>}
                  <span className="block text-xs tabular-nums text-muted-foreground">{row.availability?.label ?? "No papers chosen"}</span>
                </TableCell>
                <TableCell className="align-top text-sm">
                  {row.room ? <RoomChip size="sm" {...row.room} /> : row.isOnline ? "Online" : dash}
                  {row.seatLabel && <span className="mt-1 block text-xs text-muted-foreground tabular-nums">{row.seatLabel}</span>}
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex flex-wrap gap-1">
                    <BookingStatusBadge status={row.status} className="normal-case">{EXAM_DESK_STATUS_LABELS[row.status]}</BookingStatusBadge>
                    {row.attendance === "no_show" && <Badge variant="outline">No show</Badge>}
                  </div>
                </TableCell>
                {showActions && (
                  <TableCell className="pr-4 align-top">
                    <ExamDeskRowActions
                      bookingId={row.bookingId}
                      studentId={row.studentId}
                      // Each row is one candidate, so its exam record is that candidate's own.
                      notes={row.examId ? {
                        examId: row.examId,
                        title: row.candidates.map(c => c.name).join(", ") || "Exam",
                        canWrite,
                        currentUserId,
                      } : null}
                      actions={examDeskActions(row, canWrite)}
                      canOpenBooking={canOpenBooking}
                      canWrite={canWrite}
                      canPrintPapers={canPrintPapers && Boolean(row.availability?.canPrint)}
                      coverSlipHref={row.candidates.length > 0 ? `/api/exams/cover-slip/pdf?booking=${row.bookingId}` : null}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Panel>
  )
}
