import { EventDetailView } from "@/components/features/events/event-detail-view"
import { getEventById } from "@/lib/dummy-data/events"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface EventDetailPageProps {
  params: {
    id: string
  }
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const event = getEventById(params.id)

  if (!event) {
    notFound()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link href="/events">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Details</h1>
          <p className="text-sm text-gray-500 mt-1">
            Home / Events / <span className="text-gray-700">{event.id}</span>
          </p>
        </div>
      </div>

      <EventDetailView event={event} />
    </div>
  )
}
