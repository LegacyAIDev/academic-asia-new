import { SchoolProfileView } from "@/components/features/schools/school-profile-view"

export default function SchoolProfilePage({ params }: { params: { id: string } }) {
  return <SchoolProfileView schoolId={params.id} />
}
