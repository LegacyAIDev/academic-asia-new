import { StudentProfileView } from "@/components/features/students/student-profile-view"

export default function StudentProfilePage({ params }: { params: { id: string } }) {
  return <StudentProfileView studentId={params.id} />
}
