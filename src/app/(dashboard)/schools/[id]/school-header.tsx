import Link from "next/link"
import { ArrowLeft, Edit } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import type { SchoolWithJoins } from "@/lib/supabase/queries/schools"
import { DeleteSchoolDialog } from "./delete-school-dialog"

/** Breadcrumb, name, location line and the edit/delete actions for staff who may change schools. */
export function SchoolHeader({ school, canWrite }: { school: SchoolWithJoins; canWrite: boolean }) {
  const facts = [school.city, school.country?.label, school.gender_type?.label, school.phase?.label].filter(Boolean)

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/schools">Schools</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{school.name}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button variant="ghost" size="icon" asChild className="mt-4 shrink-0">
            <Link href="/schools" aria-label="Back to schools"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="min-w-0 space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">School</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">{school.name}</h1>
              {school.accepts_applications
                ? <Badge variant="secondary" className="text-xs">Accepting applications</Badge>
                : <Badge variant="outline" className="text-xs text-muted-foreground">Not accepting applications</Badge>}
            </div>
            {facts.length > 0 && <p className="text-sm text-muted-foreground">{facts.join(" · ")}</p>}
          </div>
        </div>
        {canWrite && (
          <div className="flex items-center gap-3">
            <Button className="gap-2 shadow-sm" asChild>
              <Link href={`/schools/${school.id}/edit`}><Edit className="h-4 w-4" /> Edit School</Link>
            </Button>
            <DeleteSchoolDialog schoolId={school.id} schoolName={school.name} />
          </div>
        )}
      </div>
    </>
  )
}
