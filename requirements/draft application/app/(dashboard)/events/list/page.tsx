import { EventTable } from "@/components/features/events/event-table"
import { DUMMY_EVENTS } from "@/lib/dummy-data/events"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default function EventListPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Events</h1>
          <p className="text-sm text-gray-500 mt-1">
            Home / Events / <span className="text-gray-700">List</span>
          </p>
        </div>
        <Link href="/events/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Event
          </Button>
        </Link>
      </div>

      <EventTable events={DUMMY_EVENTS} />
    </div>
  )
}
