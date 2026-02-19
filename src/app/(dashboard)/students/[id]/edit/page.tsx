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
import { getStudentById, getReferenceData } from "@/lib/supabase/queries/students"
import { StudentForm } from "../../student-form"

type EditStudentPageParams = { params: Promise<{ id: string }> }

export default async function EditStudentPage({ params }: EditStudentPageParams) {
  const { id } = await params

  const [student, referenceData] = await Promise.all([
    getStudentById(id),
    getReferenceData(),
  ])

  if (!student) {
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
            <BreadcrumbLink href="/students">Students</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/students/${id}`}>
              {student.first_name} {student.surname}
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
          <Link href={`/students/${id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Edit Student
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Update information for {student.first_name} {student.surname}
            {student.student_code && (
              <code className="ml-2 font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
                {student.student_code}
              </code>
            )}
          </p>
        </div>
      </div>

      {/* Form */}
      <StudentForm mode="edit" student={student} referenceData={referenceData} />
    </div>
  )
}
