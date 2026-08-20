import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  ArrowLeft, Edit, Mail, Phone, Smartphone, Briefcase, Shield,
  Calendar, User, FileText, Printer,
} from "lucide-react"
import { getStaffById } from "@/lib/supabase/queries/staff"
import { canAccess, requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"

type StaffDetailPageParams = {
  params: Promise<{ id: string }>
}

export default async function StaffDetailPage({ params }: StaffDetailPageParams) {
  await requireAccess(MODULES.STAFF)
  const canWrite = await canAccess(MODULES.STAFF, ACCESS.WRITE)

  const { id } = await params
  const staff = await getStaffById(id)

  if (!staff) notFound()

  const fullName = `${staff.first_name ?? ''} ${staff.surname ?? ''}`.trim()
  const initials = `${(staff.first_name ?? '')[0] ?? ''}${(staff.surname ?? '')[0] ?? ''}`.toUpperCase()

  const departmentColor: Record<string, string> = {
    Admin: 'bg-violet-50 text-violet-700 border-violet-200',
    Consultant: 'bg-blue-50 text-blue-700 border-blue-200',
    General: 'bg-slate-100 text-slate-600 border-slate-200',
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/staff">Staff</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{fullName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild className="mt-1">
            <Link href="/staff"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">{fullName}</h1>
              {staff.department && (
                <Badge variant="outline" className={departmentColor[staff.department.label] ?? ''}>
                  {staff.department.label}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              {staff.position && <span>{staff.position}</span>}
              {staff.join_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {new Date(staff.join_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>
        {canWrite && (
          <Button className="gap-2 shadow-sm" asChild>
            <Link href={`/staff/${id}/edit`}>
              <Edit className="h-4 w-4" /> Edit Staff
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <InfoField label="Email (Primary)" value={staff.email_1} icon={<Mail className="h-3.5 w-3.5" />} />
            <InfoField label="Email (Secondary)" value={staff.email_2} icon={<Mail className="h-3.5 w-3.5" />} />
            <InfoField label="Telephone" value={staff.telephone} icon={<Phone className="h-3.5 w-3.5" />} />
            <InfoField label="Mobile" value={staff.mobile} icon={<Smartphone className="h-3.5 w-3.5" />} />
            <InfoField label="Fax" value={staff.fax} icon={<Printer className="h-3.5 w-3.5" />} />
          </CardContent>
        </Card>

        {/* Role & Access */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Role & Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Role</span>
              {staff.department ? (
                <Badge variant="outline" className={departmentColor[staff.department.label] ?? ''}>
                  {staff.department.label}
                </Badge>
              ) : <span className="text-sm text-muted-foreground">—</span>}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Access Level</span>
              <span className="text-sm font-medium">
                {staff.admin_level_label ?? '—'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Caseload */}
      {(staff.yearly_case_count || staff.weekly_case_count || staff.daily_case_count) && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Caseload
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="text-center rounded-lg bg-muted/50 p-4">
              <p className="text-2xl font-semibold tabular-nums">{staff.yearly_case_count ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Yearly</p>
            </div>
            <div className="text-center rounded-lg bg-muted/50 p-4">
              <p className="text-2xl font-semibold tabular-nums">{staff.weekly_case_count ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Weekly</p>
            </div>
            <div className="text-center rounded-lg bg-muted/50 p-4">
              <p className="text-2xl font-semibold tabular-nums">{staff.daily_case_count ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Daily</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Remarks */}
      {staff.remarks && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Remarks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{staff.remarks}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/** Reusable info field for detail view */
function InfoField({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium flex items-center gap-1.5">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {value || '—'}
      </p>
    </div>
  )
}
