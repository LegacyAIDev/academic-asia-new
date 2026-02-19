import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ArrowLeft } from "lucide-react"
import { getSchoolById, getSchoolReferenceData } from "@/lib/supabase/queries/schools"
import { SchoolForm } from "../../school-form"

type EditSchoolPageParams = { params: Promise<{ id: string }> }

export default async function EditSchoolPage({ params }: EditSchoolPageParams) {
  const { id } = await params

  const [school, referenceData] = await Promise.all([
    getSchoolById(id),
    getSchoolReferenceData(),
  ])

  if (!school) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/schools">Schools</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/schools/${id}`}>
              {school.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/schools/${id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Edit School
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Update information for {school.name}
          </p>
        </div>
      </div>

      {/* Form */}
      <SchoolForm mode="edit" school={school} referenceData={referenceData} />
    </div>
  )
}
