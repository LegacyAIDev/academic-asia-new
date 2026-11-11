import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { getSchoolById, getSchoolReferenceData } from "@/lib/supabase/queries/schools"
import { SchoolForm } from "../../school-form"
import { requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"

type EditSchoolPageParams = { params: Promise<{ id: string }> }

export default async function EditSchoolPage({ params }: EditSchoolPageParams) {
  await requireAccess(MODULES.SCHOOLS, ACCESS.WRITE)

  const { id } = await params

  const [school, referenceData] = await Promise.all([
    getSchoolById(id),
    getSchoolReferenceData(),
  ])

  if (!school) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Link href={`/schools/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> {school.name}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Edit details</h1>
      <SchoolForm mode="edit" school={school} referenceData={referenceData} />
    </div>
  )
}
