import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { SchoolWithJoins } from "@/lib/supabase/queries/schools"
import { SchoolHeaderActions } from "./school-header-actions"

/** Back link, name, the facts that identify the school, and its actions. */
export function SchoolHeader({ school, canWrite }: { school: SchoolWithJoins; canWrite: boolean }) {
  const facts = [
    [school.city, school.county].filter(Boolean).join(", ") || null,
    school.country?.label,
    school.gender_type?.label,
    school.phase?.label,
    school.pupil_count ? `${school.pupil_count.toLocaleString("en-GB")} pupils` : null,
  ].filter(Boolean) as string[]

  return (
    <>
      <Link href="/schools" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Schools
      </Link>
      <header className="mt-3 flex flex-col gap-4 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">{school.name}</h1>
            {school.accepts_applications
              ? <Badge variant="outline" className="border-0 bg-emerald-50 font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/15">Accepting applications</Badge>
              : <Badge variant="outline" className="font-medium text-muted-foreground">Not accepting applications</Badge>}
          </div>
          <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {facts.length > 0 ? facts.map(fact => <span key={fact}>{fact}</span>) : <span>No location or type recorded yet</span>}
          </p>
        </div>
        <SchoolHeaderActions schoolId={school.id} schoolName={school.name} canWrite={canWrite} website={school.website} email={school.email} />
      </header>
    </>
  )
}
