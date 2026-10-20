import Link from "next/link"
import { ArrowLeft, Building2, CheckCircle, Edit, XCircle } from "lucide-react"
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
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild className="mt-1">
            <Link href="/schools" aria-label="Back to schools"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 text-primary shadow-lg">
            <Building2 className="h-8 w-8" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{school.name}</h1>
              {school.accepts_applications ? (
                <Badge className="border-0 bg-emerald-50 text-emerald-700">
                  <CheckCircle className="mr-1 h-3 w-3" /> Accepting Applications
                </Badge>
              ) : (
                <Badge variant="secondary"><XCircle className="mr-1 h-3 w-3" /> Not Accepting</Badge>
              )}
            </div>
            {facts.length > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">{facts.join(" · ")}</p>
            )}
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
