import { StudentForm } from "@/components/features/students/student-form"
import { DUMMY_STUDENT } from "@/lib/dummy-data/students"

export default function EditStudentPage({ params }: { params: { id: string } }) {
  // In real app, fetch student by ID from database
  const student = DUMMY_STUDENT

  return <StudentForm mode="edit" student={student} />
}
