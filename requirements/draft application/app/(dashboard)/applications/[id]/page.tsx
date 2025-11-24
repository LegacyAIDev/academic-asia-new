import { ApplicationDetailView } from "@/components/features/applications/application-detail-view"
import { getApplicationById } from "@/lib/dummy-data/applications"
import { notFound } from "next/navigation"

export default function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const application = getApplicationById(params.id)

  if (!application) {
    notFound()
  }

  return <ApplicationDetailView application={application} />
}
