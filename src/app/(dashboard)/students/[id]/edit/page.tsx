import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { getStudentById, getReferenceData } from "@/lib/supabase/queries/students"
import { getPresentSchools } from "@/lib/supabase/queries/present-schools"
import { StudentForm } from "../../student-form"
import { requireAccess } from "@/lib/permissions/guard"
import { getAttachmentsFor } from "@/lib/supabase/queries/record-attachments"
import { ACCESS, MODULES } from "@/lib/permissions/modules"

type EditStudentPageParams = { params: Promise<{ id: string }> }

export default async function EditStudentPage({ params }: EditStudentPageParams) {
  await requireAccess(MODULES.STUDENTS, ACCESS.WRITE)

  const { id } = await params

  const [student, referenceData, presentSchools, examPaperAttachments] = await Promise.all([
    getStudentById(id),
    getReferenceData(),
    getPresentSchools(),
    getAttachmentsFor('student_exam_paper', id),
  ])

  if (!student) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Link href={`/students/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> {student.first_name} {student.surname}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Edit details</h1>
        <p className="mt-1 text-sm text-muted-foreground">{student.first_name} {student.surname}{student.student_code ? `, ${student.student_code}` : ""}</p>
      </div>

      {/* Form */}
      <StudentForm
        mode="edit"
        student={student}
        referenceData={referenceData}
        presentSchools={presentSchools}
        examPaperAttachments={examPaperAttachments}
      />
    </div>
  )
}
