import { EventForm } from "@/components/features/events/event-form"

export default function NewEventPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create New Event</h1>
        <p className="text-muted-foreground">Schedule a new event or use a template to get started quickly</p>
      </div>
      <EventForm mode="create" />
    </div>
  )
}
