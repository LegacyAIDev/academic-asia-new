import { notFound } from "next/navigation"
import { EventForm } from "@/components/features/events/event-form"
import { getEventById } from "@/lib/dummy-data/events"

export default function EditEventPage({ params }: { params: { id: string } }) {
  const event = getEventById(params.id)

  if (!event) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Event</h1>
        <p className="text-muted-foreground">Update event details and settings</p>
      </div>
      <EventForm event={event} mode="edit" />
    </div>
  )
}
