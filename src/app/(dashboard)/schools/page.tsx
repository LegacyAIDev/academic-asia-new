import Link from "next/link"
import { Suspense } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  MoreHorizontal,
  Mail,
  Phone,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Building2,
  Users,
  Globe,
  CheckCircle,
  ExternalLink,
} from "lucide-react"
import { getSchoolsList, type SchoolListItem } from "@/lib/supabase/queries/schools"
import { SchoolsFilters } from "./schools-filters"
import { Skeleton } from "@/components/ui/skeleton"

type SearchParams = Promise<{
  page?: string
  search?: string
  country?: string
  gender?: string
  phase?: string
}>

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const page = parseInt(params.page ?? "1", 10)
  const search = params.search ?? ""
  const countryId = params.country ? parseInt(params.country, 10) : undefined
  const genderTypeId = params.gender ? parseInt(params.gender, 10) : undefined
  const phaseId = params.phase ? parseInt(params.phase, 10) : undefined

  const { schools, totalCount, totalPages } = await getSchoolsList({
    page,
    pageSize: 50,
    search,
    countryId,
    genderTypeId,
    phaseId,
  })

  // Calculate stats
  const stats = [
    { label: "Total Schools", value: totalCount.toLocaleString(), icon: Building2 },
    { label: "Accepting Applications", value: schools.filter(s => s.accepts_applications).length, icon: CheckCircle },
    { label: "Total Pupils", value: schools.reduce((acc, s) => acc + (s.pupil_count ?? 0), 0).toLocaleString(), icon: Users },
    { label: "Total Boarders", value: schools.reduce((acc, s) => acc + (s.boarder_count ?? 0), 0).toLocaleString(), icon: Globe },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Schools</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage UK and international schools for student placements
          </p>
        </div>
        <Button className="gap-2 shadow-sm" asChild>
          <Link href="/schools/new">
            <Plus className="h-4 w-4" />
            Add School
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-muted/30 px-6 py-4">
          <Suspense fallback={<Skeleton className="h-9 w-full max-w-md" />}>
            <SchoolsFilters />
          </Suspense>
        </CardHeader>

        <CardContent className="p-0">
          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b bg-muted/20">
                <TableHead className="font-medium pl-6">School</TableHead>
                <TableHead className="font-medium">Location</TableHead>
                <TableHead className="font-medium">Type</TableHead>
                <TableHead className="font-medium">Students</TableHead>
                <TableHead className="font-medium">Status</TableHead>
                <TableHead className="w-12 pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No schools found. Try adjusting your filters.
                  </TableCell>
                </TableRow>
              ) : (
                schools.map((school) => (
                  <SchoolRow key={school.id} school={school} />
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{schools.length}</span> of{" "}
              <span className="font-medium">{totalCount.toLocaleString()}</span> schools
            </p>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              searchParams={params}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SchoolRow({ school }: { school: SchoolListItem }) {
  return (
    <TableRow className="group cursor-pointer">
      <TableCell className="pl-6">
        <div>
          <Link
            href={`/schools/${school.id}`}
            className="font-medium text-foreground hover:text-primary transition-colors"
          >
            {school.name}
          </Link>
          <div className="flex items-center gap-2 mt-1">
            {school.website && (
              <a
                href={school.website.startsWith('http') ? school.website : `https://${school.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Website
              </a>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          <p className="text-foreground">{school.city ?? '—'}</p>
          <p className="text-xs text-muted-foreground">
            {[school.county, school.country?.label].filter(Boolean).join(', ') || '—'}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {school.gender_type && (
            <Badge variant="outline" className="text-xs">
              {school.gender_type.label}
            </Badge>
          )}
          {school.phase && (
            <Badge variant="secondary" className="text-xs">
              {school.phase.label}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          <p className="text-foreground">{school.pupil_count?.toLocaleString() ?? '—'} pupils</p>
          {school.boarder_count !== null && school.boarder_count > 0 && (
            <p className="text-xs text-muted-foreground">{school.boarder_count.toLocaleString()} boarders</p>
          )}
        </div>
      </TableCell>
      <TableCell>
        {school.accepts_applications ? (
          <Badge className="bg-emerald-50 text-emerald-700 border-0">
            Accepting
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-muted-foreground">
            Not Accepting
          </Badge>
        )}
      </TableCell>
      <TableCell className="pr-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/schools/${school.id}`} className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                View Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/schools/${school.id}/edit`} className="flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                Edit School
              </Link>
            </DropdownMenuItem>
            {school.email && (
              <DropdownMenuItem asChild>
                <a href={`mailto:${school.email}`} className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Send Email
                </a>
              </DropdownMenuItem>
            )}
            {school.telephone && (
              <DropdownMenuItem asChild>
                <a href={`tel:${school.telephone}`} className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Call School
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center gap-2 text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

type PaginationProps = {
  currentPage: number
  totalPages: number
  searchParams: Record<string, string | undefined>
}

function Pagination({ currentPage, totalPages, searchParams }: PaginationProps) {
  const createPageUrl = (page: number) => {
    const params = new URLSearchParams()
    if (searchParams.search) params.set('search', searchParams.search)
    if (searchParams.country) params.set('country', searchParams.country)
    if (searchParams.gender) params.set('gender', searchParams.gender)
    if (searchParams.phase) params.set('phase', searchParams.phase)
    params.set('page', page.toString())
    return `/schools?${params.toString()}`
  }

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('ellipsis')

      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) pages.push(i)

      if (currentPage < totalPages - 2) pages.push('ellipsis')
      pages.push(totalPages)
    }

    return pages
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        className="gap-1"
        asChild={currentPage > 1}
      >
        {currentPage > 1 ? (
          <Link href={createPageUrl(currentPage - 1)}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Link>
        ) : (
          <>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </>
        )}
      </Button>
      <div className="flex items-center gap-1">
        {getPageNumbers().map((pageNum, idx) => (
          pageNum === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">...</span>
          ) : (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? "default" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              asChild={currentPage !== pageNum}
            >
              {currentPage === pageNum ? (
                pageNum
              ) : (
                <Link href={createPageUrl(pageNum)}>{pageNum}</Link>
              )}
            </Button>
          )
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        className="gap-1"
        asChild={currentPage < totalPages}
      >
        {currentPage < totalPages ? (
          <Link href={createPageUrl(currentPage + 1)}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <>
            Next
            <ChevronRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  )
}
