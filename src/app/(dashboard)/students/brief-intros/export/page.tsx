import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
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
import { StudentsFilters } from '../../students-filters'
import { ExportControls } from './export-controls'
import { StudentPicker, type PickerStudent } from './student-picker'
import { studentsListHref } from '@/lib/students/list-url'
import { cn } from '@/lib/utils'

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
  const selectedIds = (params.ids ?? '').split(',').map((id) => id.trim()).filter(Boolean)

  // The list clamps a page past the end, so page numbers below use the page it served.
  const { students, totalCount, totalPages, page } = await getStudentsList({
    page: parseInt(params.page ?? '1', 10),
    pageSize: PAGE_SIZE,
    ...parseStudentListFilters(params),
  })

  // One lookup covering both the rows on screen and the wider selection, so the
  // "will be left out" warning stays accurate while paging.
  const idsToCheck = [...new Set([...students.map((s) => s.id), ...selectedIds])]
  const withIntro = await getStudentIdsWithBriefIntro(idsToCheck)

  const pickerStudents: PickerStudent[] = students.map((student) => ({
    id: student.id,
    // Same name order as the students list.
    name: [student.first_name, student.surname].filter(Boolean).join(' ') || 'Unnamed student',
    code: student.student_code,
    hasIntro: withIntro.has(student.id),
  }))

  const exportableCount = selectedIds.filter((id) => withIntro.has(id)).length

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Link href="/students" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Students
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Export brief introductions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter, tick the students, then download a PDF booklet or a spreadsheet.
        </p>
      </div>

      <StudentsFilters preserveParams={['ids']} />

      <nav aria-label="Introduction" className="flex flex-wrap gap-1.5">
        {([[null, 'All students'], ['yes', 'Introduction written'], ['no', 'Not written yet']] as const).map(([value, label]) => {
          const current = (params.intro ?? null) === value
          return (
            <Link
              key={label}
              href={studentsListHref(params, { intro: value }, '/students/brief-intros/export')}
              aria-current={current ? 'true' : undefined}
              className={cn('rounded-full border px-3 py-1 text-sm transition-colors', current ? 'border-brand-navy bg-brand-navy text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      <StudentPicker students={pickerStudents} selectedIds={selectedIds} cap={MAX_EXCEL_INTROS} />

      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} params={params} />

      {/* Kept at the foot of the screen, so the choice and the download are always in reach. */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <ExportControls
          selectedIds={selectedIds}
          exportableCount={exportableCount}
          pdfCap={MAX_PDF_INTROS}
          excelCap={MAX_EXCEL_INTROS}
        />
      </div>
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
