import { canAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"
import {
  deriveExamDeskOptions, filterExamDeskRows, hasExamDeskFilters, reconcileExamDeskFilters, sortExamDeskRows,
} from "@/lib/exams/exam-desk-filter-sort"
import { splitExamDeskRows, toExamDeskRows } from "@/lib/exams/exam-desk-rows"
import { examsHref, parseExamDeskParams } from "@/lib/exams/exam-page-search-params"
import { attachAccess } from "@/lib/attachments/attach-points"
import { snapshotPapers } from "@/lib/scheduler/assessment-snapshot"
import type { RawSearchParams } from "@/lib/scheduler/search-params"
import { EXAM_DESK_MAX_ROWS, getExamDeskBookings } from "@/lib/supabase/queries/exam-desk"
import { getExamPaperStatuses } from "@/lib/supabase/queries/exam-papers"
import { getSignedInUserId } from "@/lib/supabase/queries/record-notes"
import { ExamDeskFilters } from "./exam-desk-filters"
import { ExamDeskTable } from "./exam-desk-table"

/**
 * The exam officers' desk: who is expected for an examination on the chosen
 * dates and who has arrived. It loads the bookings of the date range once and
 * leaves filtering, searching and sorting to the pure helpers in src/lib/exams.
 */
export async function ExamDeskView({ raw }: { raw: RawSearchParams }) {
  const requested = parseExamDeskParams(raw)
  const paperAccess = attachAccess("school_entrance_exam_paper")
  const [bookings, canWrite, canOpenBooking, canOpenStudent, canPrintPapers, currentUserId] = await Promise.all([
    getExamDeskBookings({ from: requested.from, to: requested.to }),
    canAccess(MODULES.EXAMS, ACCESS.WRITE),
    canAccess(MODULES.SCHEDULER),
    canAccess(MODULES.STUDENTS),
    canAccess(paperAccess.module, paperAccess.read),
    getSignedInUserId(),
  ])

  // Paper files are uploaded after an exam is booked, so their state is read fresh for the papers on screen.
  const paperIds = bookings.flatMap(booking => snapshotPapers(booking.assessment_snapshot).map(paper => paper.id))
  const paperStatuses = await getExamPaperStatuses(paperIds)
  const allRows = toExamDeskRows(bookings, paperStatuses)
  const options = deriveExamDeskOptions(allRows)
  const params = reconcileExamDeskFilters(requested, options)
  const rows = sortExamDeskRows(filterExamDeskRows(allRows, params), params.sort, params.dir)
  const { booked, showedUp, waiting } = splitExamDeskRows(rows)

  const filtered = hasExamDeskFilters(params)
  const tableProps = {
    raw,
    sort: params.sort,
    dir: params.dir,
    showDate: params.from !== params.to,
    canWrite,
    canOpenBooking,
    canOpenStudent,
    canPrintPapers,
    currentUserId,
  }

  return (
    <div className="space-y-6">
      <ExamDeskFilters params={params} options={options} canClear={examsHref(raw, { view: null }) !== "/exams"} />

      {paperStatuses === null && (
        <p role="alert" className="text-sm text-destructive">
          Paper availability could not be loaded. Reload the page before relying on the paper column.
        </p>
      )}
      {bookings.length >= EXAM_DESK_MAX_ROWS && (
        <p className="text-sm text-muted-foreground">
          Showing the first {EXAM_DESK_MAX_ROWS.toLocaleString()} bookings. Choose a shorter date range to see the rest.
        </p>
      )}

      <ExamDeskTable
        {...tableProps}
        title="Booked list"
        subtitle="Expected students"
        countLabel={`${waiting} waiting`}
        rows={booked}
        emptyText={filtered ? "No examinations match these filters." : "No examinations are booked for these dates."}
      />
      <ExamDeskTable
        {...tableProps}
        title="Showed up list"
        subtitle="Students present for examination"
        countLabel={`${showedUp.length} present`}
        rows={showedUp}
        emptyText={filtered ? "No arrivals match these filters." : "Nobody has been marked as showed up yet."}
      />
    </div>
  )
}
