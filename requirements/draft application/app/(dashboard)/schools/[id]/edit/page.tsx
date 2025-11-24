import { SchoolForm } from "@/components/features/schools/school-form"
import { DUMMY_SCHOOLS } from "@/lib/dummy-data/schools"

export default function EditSchoolPage({ params }: { params: { id: string } }) {
  // In real app, fetch school by ID from database
  const school = DUMMY_SCHOOLS.find((s) => s.id === params.id) || DUMMY_SCHOOLS[0]

  return <SchoolForm mode="edit" school={school} />
}
