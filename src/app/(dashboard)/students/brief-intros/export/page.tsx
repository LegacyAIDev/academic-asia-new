import Link from 'next/link'
import { ArrowLeft, Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { requireAccess } from '@/lib/permissions/guard'
import { MODULES } from '@/lib/permissions/modules'
import { getStudentsList } from '@/lib/supabase/queries/students'
import {
  getStudentIdsWithBriefIntro,
  MAX_EXCEL_INTROS,
  MAX_PDF_INTROS,
} from '@/lib/supabase/queries/brief-intro-export'
import {
  parseStudentListFilters,
  type StudentListSearchParams,
} from '@/lib/students/parse-list-filters'
import { studentSortName } from '@/lib/brief-intro/export-shaping'
import { StudentsFilters } from '../../students-filters'
import { ExportControls } from './export-controls'
import { StudentPicker, type PickerStudent } from './student-picker'

/**
 * Bulk export screen for Brief Introductions.
 *
 * Reuses the students list filters wholesale rather than growing a second,
 * divergent filter panel. The selection is carried in `?ids=` so it survives
 * filtering and paging — see StudentPicker.
 */

type SearchParams = Promise<StudentListSearchParams & { ids?: string }>

const PAGE_SIZE = 50

export default async function BriefIntroExportPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requireAccess(MODULES.STUDENTS)

  const params = await searchParams
  const page = parseInt(params.page ?? '1', 10)
  const selectedIds = (params.ids ?? '').split(',').map((id) => id.trim()).filter(Boolean)

  const { students, totalCount, totalPages } = await getStudentsList({
    page,
    pageSize: PAGE_SIZE,
    ...parseStudentListFilters(params),
  })

  // One lookup covering both the rows on screen and the wider selection, so the
  // "will be left out" warning stays accurate while paging.
  const idsToCheck = [...new Set([...students.map((s) => s.id), ...selectedIds])]
  const withIntro = await getStudentIdsWithBriefIntro(idsToCheck)

  const pickerStudents: PickerStudent[] = students.map((student) => ({
    id: student.id,
    name: studentSortName(student.first_name, student.surname),
    code: student.student_code,
    hasIntro: withIntro.has(student.id),
  }))

  const exportableCount = selectedIds.filter((id) => withIntro.has(id)).length

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/students">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to students
          </Link>
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <Languages className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Export brief introductions</h1>
            <p className="text-sm text-muted-foreground">
              Filter, pick the students, and download a PDF booklet or a spreadsheet.
            </p>
          </div>
        </div>
      </div>

      <StudentsFilters preserveParams={['ids']} />

      <ExportControls
        selectedIds={selectedIds}
        exportableCount={exportableCount}
        pdfCap={MAX_PDF_INTROS}
        excelCap={MAX_EXCEL_INTROS}
      />

      <StudentPicker students={pickerStudents} selectedIds={selectedIds} cap={MAX_EXCEL_INTROS} />

      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} params={params} />
    </div>
  )
}

/** Paging that carries every current parameter, selection included. */
function Pagination({
  page,
  totalPages,
  totalCount,
  params,
}: {
  page: number
  totalPages: number
  totalCount: number
  params: StudentListSearchParams & { ids?: string }
}) {
  if (totalPages <= 1) {
    return (
      <p className="text-xs text-muted-foreground">
        {totalCount} student{totalCount === 1 ? '' : 's'} match these filters.
      </p>
    )
  }

  const href = (target: number) => {
    const next = new URLSearchParams(
      Object.entries(params).filter(([, value]) => Boolean(value)) as [string, string][]
    )
    next.set('page', String(target))
    return `?${next.toString()}`
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">
        Page {page} of {totalPages} · {totalCount} students
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
          {page > 1 ? <Link href={href(page - 1)}>Previous</Link> : <span>Previous</span>}
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} asChild={page < totalPages}>
          {page < totalPages ? <Link href={href(page + 1)}>Next</Link> : <span>Next</span>}
        </Button>
      </div>
    </div>
  )
}
