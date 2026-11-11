import Link from "next/link"
import { Suspense } from "react"
import { Building2, ChevronLeft, ChevronRight, ExternalLink, Mail, MoreHorizontal, Pencil, Phone } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getSchoolsList, getSchoolFilterOptions, type SchoolListItem } from "@/lib/supabase/queries/schools"
import { pageWindow, studentsListHref } from "@/lib/students/list-url"
import { canAccess, requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"
import { SchoolsFilters } from "./schools-filters"
import { SchoolSelectCheckbox, SchoolSelectAllCheckbox } from "./school-select-checkbox"
import { SchoolSelectionToolbar } from "./school-selection-toolbar"
import { AddSchoolSheet } from "./school-form-sheet"

type SearchParams = Promise<{
  page?: string
  search?: string
  country?: string
  gender?: string
  phase?: string
  county?: string
  religion?: string
  institution?: string
  minPupils?: string
  minBoarders?: string
  maxFee?: string
  sort?: string
  dir?: string
}>

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requireAccess(MODULES.SCHOOLS)
  const canWrite = await canAccess(MODULES.SCHOOLS, ACCESS.WRITE)

  const params = await searchParams
  const page = parseInt(params.page ?? "1", 10)
  const search = params.search ?? ""
  const countryId = params.country ? parseInt(params.country, 10) : undefined
  const genderTypeId = params.gender ? parseInt(params.gender, 10) : undefined
  const phaseId = params.phase ? parseInt(params.phase, 10) : undefined

  // Numeric filters come from a user-editable URL: reject anything non-numeric
  // and clamp to a sane range rather than passing it through to the query.
  const positiveInt = (raw: string | undefined, max: number) => {
    if (!raw) return undefined
    const value = Number(raw)
    if (!Number.isFinite(value) || value < 0) return undefined
    return Math.min(Math.floor(value), max)
  }

  const [{ schools, totalCount, totalPages }, filterOptions] = await Promise.all([
    getSchoolsList({
      page,
      pageSize: 50,
      search,
      countryId,
      genderTypeId,
      phaseId,
      county: params.county ?? undefined,
      religiousAffiliationId: params.religion ? parseInt(params.religion, 10) : undefined,
      institutionTypeId: params.institution ? parseInt(params.institution, 10) : undefined,
      minPupils: positiveInt(params.minPupils, 100_000),
      minBoarders: positiveInt(params.minBoarders, 100_000),
      maxFee: positiveInt(params.maxFee, 1_000_000),
      sortBy: params.sort,
      sortOrder: params.dir === 'desc' ? 'desc' : 'asc',
    }),
    getSchoolFilterOptions(),
  ])

  const listParams = params as Record<string, string | undefined>
  const href = (changes: Record<string, string | null>) => studentsListHref(listParams, changes, "/schools")
  const sortKey = params.sort ?? "name"
  const dir = params.dir === "desc" ? "desc" : "asc"
  const sortHref = (key: string) => href({ sort: key === "name" && !(sortKey === "name" && dir === "asc") ? null : key, dir: sortKey === key && dir === "asc" ? "desc" : null })
  const direction = (key: string) => (sortKey === key ? dir : null)
  // Hide a column no school on this page has anything for.
  const show = {
    location: schools.some(s => s.city || s.county || s.country),
    type: schools.some(s => s.gender_type || s.phase),
    pupils: schools.some(s => s.pupil_count),
    fee: schools.some(s => s.current_course_fee !== null),
  }
  const filtered = Object.entries(params).some(([key, value]) => value && !["page", "sort", "dir"].includes(key))

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Schools</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalCount.toLocaleString("en-GB")} {filtered ? "matching" : "schools"}. Tick schools to compare them or export a PDF.
          </p>
        </div>
        {canWrite && <AddSchoolSheet />}
      </header>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b px-4 py-3 sm:px-5">
          <Suspense fallback={<Skeleton className="h-9 w-full max-w-md" />}>
            <SchoolsFilters options={filterOptions} />
          </Suspense>
        </div>

        {schools.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <p className="font-medium">{filtered ? "No schools match" : "No schools yet"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{filtered ? "Try fewer words or clear the filters." : "Schools you add will be listed here."}</p>
            {filtered && <Button variant="outline" className="mt-5" asChild><Link href="/schools">Clear search and filters</Link></Button>}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 pl-4 sm:pl-5">
                  <SchoolSelectAllCheckbox pageSchools={schools.map(s => ({ id: s.id, name: s.name }))} />
                </TableHead>
                <SortableTableHead label="School" href={sortHref("name")} direction={direction("name")} />
                {show.location && <SortableTableHead label="Location" href={sortHref("city")} direction={direction("city")} className="hidden md:table-cell" />}
                {show.type && <TableHead className="hidden lg:table-cell">Type</TableHead>}
                {show.pupils && <SortableTableHead label="Pupils" href={sortHref("pupil_count")} direction={direction("pupil_count")} className="hidden lg:table-cell" />}
                {show.fee && <SortableTableHead label="Latest fee" href={sortHref("current_course_fee")} direction={direction("current_course_fee")} className="hidden xl:table-cell" />}
                <TableHead>Status</TableHead>
                <TableHead className="w-12 pr-4"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools.map(school => <SchoolRow key={school.id} school={school} show={show} canWrite={canWrite} />)}
            </TableBody>
          </Table>
        )}

        {totalPages > 1 && (
          <footer className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium tabular-nums text-foreground">{((page - 1) * 50 + 1).toLocaleString("en-GB")}–{Math.min(page * 50, totalCount).toLocaleString("en-GB")}</span> of {totalCount.toLocaleString("en-GB")}
            </p>
            <nav aria-label="Pages" className="flex items-center gap-1">
              <Button variant="outline" size="sm" asChild={page > 1} disabled={page <= 1}>
                {page > 1 ? <Link href={href({ page: String(page - 1) })}><ChevronLeft className="h-4 w-4" /> Previous</Link> : <span className="inline-flex items-center gap-1"><ChevronLeft className="h-4 w-4" /> Previous</span>}
              </Button>
              <div className="hidden items-center gap-1 sm:flex">
                {pageWindow(page, totalPages).map((n, i) =>
                  n === null ? <span key={`gap-${i}`} className="px-1.5 text-muted-foreground" aria-hidden="true">…</span>
                    : n === page ? <span key={n} aria-current="page" className="flex h-8 min-w-8 items-center justify-center rounded-md bg-brand-navy px-2 text-sm font-medium text-white">{n}</span>
                      : <Link key={n} href={href({ page: String(n) })} className="flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">{n}</Link>,
                )}
              </div>
              <Button variant="outline" size="sm" asChild={page < totalPages} disabled={page >= totalPages}>
                {page < totalPages ? <Link href={href({ page: String(page + 1) })}>Next <ChevronRight className="h-4 w-4" /></Link> : <span className="inline-flex items-center gap-1">Next <ChevronRight className="h-4 w-4" /></span>}
              </Button>
            </nav>
          </footer>
        )}

        <SchoolSelectionToolbar />
      </section>
    </div>
  )
}

function SchoolRow({ school, show, canWrite }: {
  school: SchoolListItem
  show: { location: boolean; type: boolean; pupils: boolean; fee: boolean }
  canWrite: boolean
}) {
  const href = `/schools/${school.id}`
  const area = [school.county, school.country?.label].filter(Boolean).join(", ")
  return (
    // The name link stretches over the row; the tick box and menu sit above it.
    <TableRow className="group relative">
      <TableCell className="relative z-10 pl-4 sm:pl-5">
        <SchoolSelectCheckbox school={{ id: school.id, name: school.name }} />
      </TableCell>
      <TableCell className="py-3">
        <Link href={href} className="font-medium after:absolute after:inset-0 after:content-[''] group-hover:text-brand-navy">{school.name}</Link>
        {school.website && <p className="truncate text-xs text-muted-foreground">{school.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</p>}
      </TableCell>
      {show.location && (
        <TableCell className="hidden text-sm md:table-cell">
          {school.city || area ? (
            <>
              <p>{school.city || area}</p>
              {school.city && area && <p className="text-xs text-muted-foreground">{area}</p>}
            </>
          ) : <span className="text-muted-foreground/60">—</span>}
        </TableCell>
      )}
      {show.type && (
        <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
          {[school.gender_type?.label, school.phase?.label].filter(Boolean).join(", ") || <span className="text-muted-foreground/60">—</span>}
        </TableCell>
      )}
      {show.pupils && (
        <TableCell className="hidden text-sm tabular-nums lg:table-cell">
          {school.pupil_count ? school.pupil_count.toLocaleString("en-GB") : <span className="text-muted-foreground/60">—</span>}
          {school.boarder_count ? <p className="text-xs text-muted-foreground">{school.boarder_count.toLocaleString("en-GB")} boarders</p> : null}
        </TableCell>
      )}
      {show.fee && (
        <TableCell className="hidden text-sm tabular-nums xl:table-cell">
          {school.current_course_fee !== null ? (
            <>
              <p>£{Number(school.current_course_fee).toLocaleString("en-GB", { maximumFractionDigits: 0 })}</p>
              {/* The fee year varies by school, so an old figure is not read as current. */}
              <p className="text-xs text-muted-foreground">{school.current_course_fee_year ?? "Year not recorded"}</p>
            </>
          ) : <span className="text-muted-foreground/60">—</span>}
        </TableCell>
      )}
      <TableCell>
        {school.accepts_applications
          ? <Badge variant="outline" className="border-0 bg-emerald-50 font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/15">Accepting</Badge>
          : <Badge variant="outline" className="font-medium text-muted-foreground">Not accepting</Badge>}
      </TableCell>
      <TableCell className="relative z-10 pr-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label={`Actions for ${school.name}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild><Link href={href}><Building2 className="h-4 w-4" /> Open school</Link></DropdownMenuItem>
            {canWrite && <DropdownMenuItem asChild><Link href={`${href}/edit`}><Pencil className="h-4 w-4" /> Edit details</Link></DropdownMenuItem>}
            {school.website && (
              <DropdownMenuItem asChild>
                <a href={school.website.startsWith("http") ? school.website : `https://${school.website}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Open website</a>
              </DropdownMenuItem>
            )}
            {school.email && <DropdownMenuItem asChild><a href={`mailto:${school.email}`}><Mail className="h-4 w-4" /> Email the school</a></DropdownMenuItem>}
            {school.telephone && <DropdownMenuItem asChild><a href={`tel:${school.telephone}`}><Phone className="h-4 w-4" /> Call the school</a></DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
