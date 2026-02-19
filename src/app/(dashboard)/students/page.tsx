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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  Users,
  UserCheck,
  UserPlus,
  Clock,
} from "lucide-react"
import { getStudentsList, type StudentListItem } from "@/lib/supabase/queries/students"
import { StudentsFilters } from "./students-filters"
import { Skeleton } from "@/components/ui/skeleton"

// Status badge styling based on status code
const statusStyles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  new: "bg-indigo-50 text-indigo-700 border-indigo-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
  dead: "bg-rose-50 text-rose-700 border-rose-200",
}

// Placement badge styling based on placement code
const placementStyles: Record<string, { color: string; label: string }> = {
  cold: { color: "bg-sky-100 text-sky-700", label: "Cold" },
  warm: { color: "bg-amber-100 text-amber-700", label: "Warm" },
  hot: { color: "bg-orange-100 text-orange-700", label: "Hot" },
  very_hot: { color: "bg-rose-100 text-rose-700", label: "Very Hot" },
}

type SearchParams = Promise<{
  page?: string
  search?: string
  status?: string
  placement?: string
}>

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const page = parseInt(params.page ?? "1", 10)
  const search = params.search ?? ""
  const statusId = params.status ? parseInt(params.status, 10) : undefined
  const placementId = params.placement ? parseInt(params.placement, 10) : undefined

  const { students, totalCount, totalPages } = await getStudentsList({
    page,
    pageSize: 50,
    search,
    statusId,
    placementId,
  })

  // Calculate stats from the data
  const stats = [
    { label: "Total Students", value: totalCount.toLocaleString(), icon: Users },
    { label: "Active", value: students.filter(s => s.status?.code === 'active').length, icon: UserCheck },
    { label: "New Leads", value: students.filter(s => s.status?.code === 'new').length, icon: UserPlus },
    { label: "Pending", value: students.filter(s => s.status?.code === 'pending').length, icon: Clock },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Students</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage student profiles, track applications, and monitor placement progress
          </p>
        </div>
        <Button className="gap-2 shadow-sm" asChild>
          <Link href="/students/new">
            <Plus className="h-4 w-4" />
            Add Student
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
            <StudentsFilters />
          </Suspense>
        </CardHeader>

        <CardContent className="p-0">
          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b bg-muted/20">
                <TableHead className="font-medium pl-6">Student</TableHead>
                <TableHead className="font-medium">ID</TableHead>
                <TableHead className="font-medium">Contact</TableHead>
                <TableHead className="font-medium">School</TableHead>
                <TableHead className="font-medium">Status</TableHead>
                <TableHead className="font-medium">Lead</TableHead>
                <TableHead className="w-12 pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No students found. Try adjusting your filters.
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <StudentRow key={student.id} student={student} />
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{students.length}</span> of{" "}
              <span className="font-medium">{totalCount.toLocaleString()}</span> students
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

function StudentRow({ student }: { student: StudentListItem }) {
  const statusCode = student.status?.code ?? 'new'
  const placementCode = student.status?.code ?? 'cold'
  const statusStyle = statusStyles[statusCode] ?? statusStyles.new
  const placementStyle = placementStyles[student.placement?.code ?? 'cold'] ?? placementStyles.cold

  return (
    <TableRow className="group cursor-pointer">
      <TableCell className="pl-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs font-medium">
              {student.first_name?.[0] ?? ''}{student.surname?.[0] ?? ''}
            </AvatarFallback>
          </Avatar>
          <div>
            <Link
              href={`/students/${student.id}`}
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              {student.first_name} {student.surname}
            </Link>
            {student.chinese_name && (
              <p className="text-xs text-muted-foreground">{student.chinese_name}</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
          {student.student_code ?? '—'}
        </code>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-0.5">
          {student.email && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="truncate max-w-[150px]">{student.email}</span>
            </div>
          )}
          {student.mobile && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              {student.mobile}
            </div>
          )}
          {!student.email && !student.mobile && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div>
          <p className="text-sm truncate max-w-[180px]">{student.present_school ?? '—'}</p>
          <p className="text-xs text-muted-foreground">
            {student.course?.label ?? '—'} {student.entry_year ? `· ${student.entry_year.slice(0, 4)}` : ''}
          </p>
        </div>
      </TableCell>
      <TableCell>
        {student.status && (
          <Badge variant="outline" className={`${statusStyle} border font-medium`}>
            {student.status.label}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {student.placement && (
          <Badge className={`${placementStyle.color} border-0 font-medium`}>
            {placementStyle.label}
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
              <Link href={`/students/${student.id}`} className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                View Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/students/${student.id}/edit`} className="flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                Edit Student
              </Link>
            </DropdownMenuItem>
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
    if (searchParams.status) params.set('status', searchParams.status)
    if (searchParams.placement) params.set('placement', searchParams.placement)
    params.set('page', page.toString())
    return `/students?${params.toString()}`
  }

  // Calculate which page numbers to show
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
