import { ApplicationForm } from "@/components/features/applications/application-form"
import { dummyApplications } from "@/lib/dummy-data/applications"
import { notFound } from "next/navigation"

export default function EditApplicationPage({ params }: { params: { id: string } }) {
  const application = dummyApplications.find((app) => app.id === params.id)

  if (!application) {
    notFound()
  }

  return <ApplicationForm application={application} mode="edit" />
}
