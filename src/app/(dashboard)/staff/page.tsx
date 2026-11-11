import Link from "next/link"
import { Suspense } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Panel, PanelEmpty } from "@/components/ui/panel"
import { getStaffList, getDepartments } from "@/lib/supabase/queries/staff"
import { StaffFilters } from "./staff-filters"
import { AddStaffButton } from "./staff-form-sheet"
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
  const filtered = Boolean(params.search || departmentId)

  const [staff, departments] = await Promise.all([
    getStaffList({ search: params.search, departmentId }),
    getDepartments(),
  ])

  // Show a column only when someone has something in it.
  const show = {
    department: staff.some(s => s.department),
    position: staff.some(s => s.position),
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
          <p className="mt-1 text-sm text-muted-foreground">Everyone who signs in to the CRM, and what they can open</p>
        </div>
        {canWrite && <AddStaffButton />}
      </div>

      <Suspense fallback={<Skeleton className="h-9 w-full max-w-md" />}>
        <StaffFilters departments={departments} />
      </Suspense>

      <Panel title="Team" count={staff.length} flush>
        {staff.length === 0 ? (
          <PanelEmpty title={filtered ? "No one matches" : "No staff yet"}>
            {filtered ? "Try another name or department." : "Add the first staff member so they can sign in."}
          </PanelEmpty>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Name</TableHead>
                  <TableHead>Contact</TableHead>
                  {show.position && <TableHead>Position</TableHead>}
                  {show.department && <TableHead>Department</TableHead>}
                  <TableHead className="pr-4">Access level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map(member => (
                  // The name link stretches over the row, so anywhere on it opens the person.
                  <TableRow key={member.id} className="group relative">
                    <TableCell className="py-3 pl-4">
                      <Link href={`/staff/${member.id}`} className="text-sm font-medium after:absolute after:inset-0 after:content-[''] group-hover:text-brand-navy">
                        {[member.first_name, member.surname].filter(Boolean).join(" ") || "Unnamed"}
                      </Link>
                      {member.join_date && (
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(member.join_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="block max-w-[240px] truncate">{member.email_1 ?? ""}</span>
                      {(member.mobile || member.telephone) && (
                        <span className="text-xs text-muted-foreground">{member.mobile ?? member.telephone}</span>
                      )}
                    </TableCell>
                    {show.position && <TableCell className="text-sm">{member.position ?? ""}</TableCell>}
                    {show.department && <TableCell className="text-sm">{member.department?.label ?? ""}</TableCell>}
                    <TableCell className="pr-4">
                      {member.admin_level_label
                        ? <Badge variant="outline" className="whitespace-nowrap text-xs font-medium">{member.admin_level_label}</Badge>
                        : <span className="text-sm text-muted-foreground">Not set</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
    </div>
  )
}
