import Link from "next/link"
import { Suspense } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  UserCog, Mail, Phone, Smartphone, Briefcase, Users, Shield, Plus,
} from "lucide-react"
import { getStaffList, getDepartments } from "@/lib/supabase/queries/staff"
import { StaffFilters } from "./staff-filters"
import { canAccess, requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"

type SearchParams = Promise<{
  search?: string
  department?: string
}>

export default async function StaffPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAccess(MODULES.STAFF)
  const canWrite = await canAccess(MODULES.STAFF, ACCESS.WRITE)

  const params = await searchParams
  const departmentId = params.department ? parseInt(params.department, 10) : undefined

  const [staff, departments] = await Promise.all([
    getStaffList({ search: params.search, departmentId }),
    getDepartments(),
  ])

  const getInitials = (first: string | null, last: string | null) => {
    return `${(first ?? '')[0] ?? ''}${(last ?? '')[0] ?? ''}`.toUpperCase() || '?'
  }

  // Labels come from admin_levels via the query — the level number alone is not
  // a display value, and level 0 (Super Admin) is falsy, which used to blank it out.
  const adminLevelStyle: Record<string, string> = {
    'Super Admin': 'bg-rose-50 text-rose-700 border-rose-200',
    'Manager': 'bg-amber-50 text-amber-700 border-amber-200',
    'Senior Staff': 'bg-sky-50 text-sky-700 border-sky-200',
    'Staff': 'bg-slate-50 text-slate-600 border-slate-200',
    'Junior Staff': 'bg-slate-50 text-slate-600 border-slate-200',
    'Basic': 'bg-zinc-50 text-zinc-500 border-zinc-200',
  }

  const departmentColor: Record<string, string> = {
    Admin: 'bg-violet-50 text-violet-700 border-violet-200',
    Consultant: 'bg-blue-50 text-blue-700 border-blue-200',
    General: 'bg-slate-100 text-slate-600 border-slate-200',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Staff</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage team members, roles, and department assignments
          </p>
        </div>
        {canWrite && (
          <Button className="gap-2 shadow-sm" asChild>
            <Link href="/staff/new">
              <Plus className="h-4 w-4" /> New Staff
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100/80">
                <Shield className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums text-foreground">{staff.filter(s => s.department?.label === 'Admin').length}</p>
                <p className="text-xs text-muted-foreground">Admin</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100/80">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums text-foreground">{staff.filter(s => s.department?.label === 'Consultant').length}</p>
                <p className="text-xs text-muted-foreground">Consultants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <Users className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums text-foreground">{staff.filter(s => s.department?.label === 'General').length}</p>
                <p className="text-xs text-muted-foreground">General</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table with integrated filters */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-muted/30 px-6 py-4">
          <Suspense fallback={<Skeleton className="h-9 w-full max-w-md" />}>
            <StaffFilters departments={departments} />
          </Suspense>
        </CardHeader>

        <CardContent className="p-0">
          {staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
                <UserCog className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="mt-4 text-sm font-medium text-foreground">No staff found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b bg-muted/20">
                    <TableHead className="font-medium pl-6">Name</TableHead>
                    <TableHead className="font-medium">Contact</TableHead>
                    <TableHead className="font-medium">Department</TableHead>
                    <TableHead className="font-medium">Position</TableHead>
                    <TableHead className="font-medium pr-6">Access</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map(member => (
                    <TableRow key={member.id} className="group">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs font-medium">
                              {getInitials(member.first_name, member.surname)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <Link href={`/staff/${member.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                              {member.first_name} {member.surname}
                            </Link>
                            {member.join_date && (
                              <p className="text-xs text-muted-foreground">
                                Joined {new Date(member.join_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {member.email_1 && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[200px]">{member.email_1}</span>
                            </div>
                          )}
                          {member.mobile && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Smartphone className="h-3 w-3 shrink-0" />
                              {member.mobile}
                            </div>
                          )}
                          {!member.email_1 && !member.mobile && member.telephone && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3 shrink-0" />
                              {member.telephone}
                            </div>
                          )}
                          {!member.email_1 && !member.mobile && !member.telephone && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.department ? (
                          <Badge variant="outline" className={departmentColor[member.department.label] ?? ''}>
                            {member.department.label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-foreground/80">
                          {member.position ?? <span className="text-muted-foreground">—</span>}
                        </span>
                      </TableCell>
                      <TableCell className="pr-6">
                        {member.admin_level_label ? (
                          <Badge variant="outline" className={`text-xs ${adminLevelStyle[member.admin_level_label] ?? ''}`}>
                            {member.admin_level_label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Footer count */}
              <div className="border-t px-6 py-3">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-medium">{staff.length}</span> team member{staff.length !== 1 ? 's' : ''}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
