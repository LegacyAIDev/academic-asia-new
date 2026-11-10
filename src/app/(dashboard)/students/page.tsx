import Link from "next/link"
import { Suspense } from "react"
import { ChevronLeft, ChevronRight, Mail, MoreHorizontal, Pencil, Phone, Plus, SearchX, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  getStudentFilterOptions, getStudentsList, getStudentStatusCounts, type StudentListItem,
} from "@/lib/supabase/queries/students"
import { parseStudentListFilters, type StudentListSearchParams } from "@/lib/students/parse-list-filters"
import { PAGE_SIZES, pageSizeFrom, pageWindow, studentsListHref } from "@/lib/students/list-url"
import { canAccess, requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"
import { cn } from "@/lib/utils"
import { StudentsFilters } from "./students-filters"

const statusStyles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  new: "bg-sky-50 text-sky-700 ring-sky-600/15",
  pending: "bg-amber-50 text-amber-800 ring-amber-600/20",
  closed: "bg-slate-100 text-slate-600 ring-slate-500/15",
  dead: "bg-rose-50 text-rose-700 ring-rose-600/15",
}

const placementStyles: Record<string, string> = {
  cold: "text-sky-700",
  warm: "text-amber-700",
  hot: "text-orange-700",
  very_hot: "text-rose-700",
}

type Params = StudentListSearchParams & { per?: string; sort?: string; dir?: string }

const SORTABLE = ["name", "student_code", "created_at"] as const
type SortKey = (typeof SORTABLE)[number]

const addedDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Hong_Kong" })

/**
 * Every student, a page at a time. Status tabs carry real counts under the other
 * filters in use; search, filters, order, page and page size all live in the
 * URL, so any view can be shared or bookmarked.
 */
export default async function StudentsPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAccess(MODULES.STUDENTS)
  const params = await searchParams
  const filters = parseStudentListFilters(params)
  const pageSize = pageSizeFrom(params.per)
  const sort: SortKey = (SORTABLE as readonly string[]).includes(params.sort ?? "") ? (params.sort as SortKey) : "created_at"
  const dir = params.dir === "asc" || params.dir === "desc" ? params.dir : sort === "created_at" ? "desc" : "asc"

  const [canWrite, list, counts, options] = await Promise.all([
    canAccess(MODULES.STUDENTS, ACCESS.WRITE),
    getStudentsList({ page: parseInt(params.page ?? "1", 10), pageSize, sortBy: sort, sortOrder: dir, ...filters }),
    getStudentStatusCounts(filters),
    getStudentFilterOptions(),
  ])
  const { students, totalCount, totalPages, page } = list

  // Hide a column no student on this page has anything for, rather than a column of dashes.
  const showSchool = students.some(s => s.present_school || s.course || s.entry_year)
  const showConsultant = students.some(s => s.assigned_profile)
  const showLead = students.some(s => s.placement)
  const filtered = Object.entries(params).some(([key, value]) => value && !["page", "per", "sort", "dir"].includes(key))

  const sortHref = (key: SortKey) => {
    const nextDir = sort === key ? (dir === "asc" ? "desc" : "asc") : key === "created_at" ? "desc" : "asc"
    return studentsListHref(params, { sort: key === "created_at" && nextDir === "desc" ? null : key, dir: key === "created_at" && nextDir === "desc" ? null : nextDir })
  }
  const first = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, totalCount)

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {counts.all === null ? "Every student profile" : `${counts.all.toLocaleString("en-GB")} ${filtered ? "matching" : "in total"}`}
          </p>
        </div>
        {canWrite && (
          <Button asChild>
            <Link href="/students/new"><Plus className="h-4 w-4" /> Add student</Link>
          </Button>
        )}
      </header>

      <section className="overflow-hidden rounded-lg border bg-card">
      <nav aria-label="Status" className="flex gap-1 overflow-x-auto border-b px-2 pt-2 sm:px-3">
        {[{ id: null, label: "All", count: counts.all }, ...counts.statuses.map(s => ({ id: String(s.id), label: s.label, count: s.count }))].map(tab => {
          const current = (params.status ?? null) === tab.id
          return (
            <Link
              key={tab.label}
              href={studentsListHref(params, { status: tab.id })}
              aria-current={current ? "page" : undefined}
              className={cn(
                "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 pb-2.5 pt-2 text-sm font-medium transition-colors",
                current ? "border-brand-navy text-brand-navy" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {tab.label}
              {tab.count !== null && (
                <span className={cn("rounded-full px-2 py-0.5 text-xs tabular-nums", current ? "bg-brand-navy text-white" : "bg-muted text-muted-foreground")}>
                  {tab.count.toLocaleString("en-GB")}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

        <div className="border-b px-4 py-3 sm:px-5">
          <Suspense fallback={<Skeleton className="h-9 w-full max-w-md" />}>
            <StudentsFilters options={options} showStatus={false} />
          </Suspense>
        </div>

        {students.length === 0 ? (
          <EmptyList filtered={filtered} canWrite={canWrite} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <SortableTableHead label="Student" href={sortHref("name")} direction={sort === "name" ? dir : null} className="pl-4 sm:pl-5" />
                <SortableTableHead label="Code" href={sortHref("student_code")} direction={sort === "student_code" ? dir : null} className="hidden sm:table-cell" />
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                {showSchool && <TableHead className="hidden xl:table-cell">Current school</TableHead>}
                {showConsultant && <TableHead className="hidden lg:table-cell">Consultant</TableHead>}
                <TableHead>Status</TableHead>
                {showLead && <TableHead className="hidden lg:table-cell">Lead</TableHead>}
                <SortableTableHead label="Added" href={sortHref("created_at")} direction={sort === "created_at" ? dir : null} className="hidden lg:table-cell" />
                <TableHead className="w-12 pr-4"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map(student => (
                <StudentRow key={student.id} student={student} canWrite={canWrite} showSchool={showSchool} showConsultant={showConsultant} showLead={showLead} />
              ))}
            </TableBody>
          </Table>
        )}

        {totalCount > 0 && (
          <footer className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <p>
                <span className="font-medium tabular-nums text-foreground">{first.toLocaleString("en-GB")}–{last.toLocaleString("en-GB")}</span>
                {" "}of <span className="tabular-nums">{totalCount.toLocaleString("en-GB")}</span>
              </p>
              <div className="flex items-center gap-1" role="group" aria-label="Rows per page">
                <span className="hidden sm:inline">Show</span>
                {PAGE_SIZES.map(size => (
                  <Link
                    key={size}
                    href={studentsListHref(params, { per: size === PAGE_SIZES[0] ? null : String(size) })}
                    aria-current={size === pageSize ? "true" : undefined}
                    className={cn("rounded px-1.5 py-0.5 tabular-nums", size === pageSize ? "bg-muted font-medium text-foreground" : "hover:text-foreground")}
                  >
                    {size}
                  </Link>
                ))}
              </div>
            </div>
            {totalPages > 1 && <Pagination page={page} totalPages={totalPages} params={params} />}
          </footer>
        )}
      </section>
    </div>
  )
}

function StudentRow({ student, canWrite, showSchool, showConsultant, showLead }: {
  student: StudentListItem
  canWrite: boolean
  showSchool: boolean
  showConsultant: boolean
  showLead: boolean
}) {
  const href = `/students/${student.id}`
  const name = `${student.first_name ?? ""} ${student.surname ?? ""}`.trim() || "Unnamed student"
  const consultant = student.assigned_profile
  const consultantName = consultant ? [consultant.first_name, consultant.surname].filter(Boolean).join(" ") : ""
  const schoolLine = [student.course?.label, student.entry_year].filter(Boolean).join(" · ")

  return (
    // The name link stretches over the whole row, so anywhere on it opens the student.
    <TableRow className="group relative">
      <TableCell className="py-3 pl-4 sm:pl-5">
        <Link href={href} className="font-medium text-foreground after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-hover:text-brand-navy">
          {name}
        </Link>
        {(student.chinese_name || student.student_code) && (
          <p className="text-xs text-muted-foreground">
            {student.chinese_name}
            <span className="sm:hidden">{student.chinese_name && student.student_code ? " · " : ""}{student.student_code}</span>
          </p>
        )}
      </TableCell>
      <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">{student.student_code ?? "—"}</TableCell>
      <TableCell className="hidden max-w-[260px] md:table-cell">
        {student.email || student.mobile ? (
          <div className="space-y-0.5 text-xs text-muted-foreground">
            {student.email && <p className="flex items-center gap-1.5 truncate" title={student.email}><Mail className="h-3 w-3 shrink-0" aria-hidden="true" />{student.email}</p>}
            {student.mobile && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0" aria-hidden="true" />{student.mobile}</p>}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/60">No contact details</span>
        )}
      </TableCell>
      {showSchool && (
        <TableCell className="hidden max-w-[220px] xl:table-cell">
          <p className="truncate text-sm" title={student.present_school ?? undefined}>{student.present_school ?? <span className="text-muted-foreground/60">—</span>}</p>
          {schoolLine && <p className="text-xs text-muted-foreground">{schoolLine}</p>}
        </TableCell>
      )}
      {showConsultant && (
        <TableCell className="hidden text-sm lg:table-cell">
          {consultantName || <span className="text-muted-foreground/60">—</span>}
        </TableCell>
      )}
      <TableCell>
        {student.status && (
          <Badge variant="outline" className={cn("border-0 font-medium ring-1 ring-inset", statusStyles[student.status.code] ?? statusStyles.closed)}>
            {student.status.label}
          </Badge>
        )}
      </TableCell>
      {showLead && (
        <TableCell className={cn("hidden text-sm font-medium lg:table-cell", placementStyles[student.placement?.code ?? ""])}>
          {student.placement?.label ?? <span className="font-normal text-muted-foreground/60">—</span>}
        </TableCell>
      )}
      <TableCell className="hidden whitespace-nowrap text-sm tabular-nums text-muted-foreground lg:table-cell">
        {student.created_at ? addedDate.format(new Date(student.created_at)) : "—"}
      </TableCell>
      <TableCell className="relative z-10 pr-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label={`Actions for ${name}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <Link href={href}><UserRound className="h-4 w-4" /> Open profile</Link>
            </DropdownMenuItem>
            {canWrite && (
              <DropdownMenuItem asChild>
                <Link href={`${href}/edit`}><Pencil className="h-4 w-4" /> Edit details</Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

function EmptyList({ filtered, canWrite }: { filtered: boolean; canWrite: boolean }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <SearchX className="h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
      <p className="mt-3 font-medium">{filtered ? "No students match" : "No students yet"}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {filtered ? "Try fewer words in the search, or clear the filters." : "Students you add will be listed here."}
      </p>
      <div className="mt-5">
        {filtered ? (
          <Button variant="outline" asChild><Link href="/students">Clear search and filters</Link></Button>
        ) : canWrite ? (
          <Button asChild><Link href="/students/new"><Plus className="h-4 w-4" /> Add student</Link></Button>
        ) : null}
      </div>
    </div>
  )
}

function Pagination({ page, totalPages, params }: { page: number; totalPages: number; params: Params }) {
  const to = (n: number) => studentsListHref(params, { page: String(n) })
  return (
    <nav aria-label="Pages" className="flex items-center gap-1">
      <Button variant="outline" size="sm" asChild={page > 1} disabled={page <= 1} className="gap-1">
        {page > 1 ? <Link href={to(page - 1)}><ChevronLeft className="h-4 w-4" /> Previous</Link> : <span className="inline-flex items-center gap-1"><ChevronLeft className="h-4 w-4" /> Previous</span>}
      </Button>
      <div className="hidden items-center gap-1 sm:flex">
        {pageWindow(page, totalPages).map((n, i) =>
          n === null ? (
            <span key={`gap-${i}`} className="px-1.5 text-muted-foreground" aria-hidden="true">…</span>
          ) : n === page ? (
            <span key={n} aria-current="page" className="flex h-8 min-w-8 items-center justify-center rounded-md bg-brand-navy px-2 text-sm font-medium tabular-nums text-white">{n}</span>
          ) : (
            <Link key={n} href={to(n)} className="flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm tabular-nums text-muted-foreground hover:bg-muted hover:text-foreground">{n}</Link>
          ),
        )}
      </div>
      <span className="px-2 text-sm tabular-nums text-muted-foreground sm:hidden">{page} / {totalPages}</span>
      <Button variant="outline" size="sm" asChild={page < totalPages} disabled={page >= totalPages} className="gap-1">
        {page < totalPages ? <Link href={to(page + 1)}>Next <ChevronRight className="h-4 w-4" /></Link> : <span className="inline-flex items-center gap-1">Next <ChevronRight className="h-4 w-4" /></span>}
      </Button>
    </nav>
  )
}
