import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BookingStatusBadge } from "@/components/scheduler/booking-status-badge"
import { RoomChip } from "@/components/scheduler/room-chip"
import { EXAM_DESK_STATUS_LABELS, examDeskActions, type ExamDeskRow } from "@/lib/exams/exam-desk-rows"
import { examsHref, nextSort, type ExamDeskSortKey, type SortDirection } from "@/lib/exams/exam-page-search-params"
import { bookingPageHref } from "@/lib/scheduler/return-path"
import type { RawSearchParams } from "@/lib/scheduler/search-params"
import { formatHkDate, formatHkTime } from "@/lib/scheduler/time-utils"
import { ExamDeskRowActions } from "./exam-desk-row-actions"

type Props = {
  title: string
  subtitle: string
  countLabel: string
  emptyText: string
  rows: ExamDeskRow[]
  /** Current URL parameters, used to build sort links and the way back from a booking. */
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
}

const COLUMNS: { key: ExamDeskSortKey; label: string; className: string }[] = [
  { key: "time", label: "Time", className: "pl-6 min-w-[110px]" },
  { key: "student", label: "Student", className: "min-w-[170px]" },
  { key: "school", label: "School", className: "min-w-[150px]" },
  { key: "year", label: "Entry point", className: "min-w-[110px]" },
  { key: "assessment", label: "Assessment format", className: "min-w-[170px]" },
  { key: "papers", label: "Paper availability", className: "min-w-[170px]" },
  { key: "room", label: "Room / seat", className: "min-w-[150px]" },
  { key: "status", label: "Status", className: "min-w-[150px]" },
]

/** A long group exam would make its row taller than the screen, so only the first few names are listed. */
const MAX_NAMES = 5

const dash = <span className="text-muted-foreground">—</span>

/** One list of the exam desk (booked or showed up). Server-rendered; only the action buttons are interactive. */
export function ExamDeskTable(props: Props) {
  const { rows, raw, sort, dir, canWrite, canOpenBooking, canPrintPapers } = props
  const showActions = canWrite || canOpenBooking || canPrintPapers
  const returnTo = examsHref(raw)

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b bg-muted/30 px-6 py-3">
        <div>
          <h2 className="text-sm font-semibold">{props.title}</h2>
          <p className="text-xs text-muted-foreground">{props.subtitle}</p>
        </div>
        <Badge variant="outline" className="tabular-nums">{props.countLabel}</Badge>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
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
              {showActions && <TableHead className="min-w-[200px] pr-6">Actions</TableHead>}
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
              <TableRow key={row.bookingId}>
                <TableCell className="pl-6 align-top">
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
                <TableCell className="align-top text-sm">{row.schoolName ?? dash}</TableCell>
                <TableCell className="align-top text-sm">
                  {row.yearLevels.length > 0 && <span className="block font-medium">{row.yearLevels.join(", ")}</span>}
                  {row.entryYear && <span className="block tabular-nums">{row.entryYear} entry</span>}
                  {row.yearLevels.length === 0 && !row.entryYear && dash}
                </TableCell>
                <TableCell className="align-top text-sm">{row.assessment ?? dash}</TableCell>
                <TableCell className="align-top text-sm tabular-nums">
                  {row.availability?.label ?? <span className="text-muted-foreground">No papers chosen</span>}
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
                  <TableCell className="pr-6 align-top">
                    <ExamDeskRowActions
                      bookingId={row.bookingId}
                      actions={examDeskActions(row, canWrite)}
                      bookingHref={canOpenBooking ? bookingPageHref(row.bookingId, returnTo) : null}
                      canPrintPapers={canPrintPapers && Boolean(row.availability?.canPrint)}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
