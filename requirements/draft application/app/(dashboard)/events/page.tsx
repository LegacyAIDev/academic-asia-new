import { CalendarView } from "@/components/features/events/calendar-view"
import { Calendar, List } from "lucide-react"
import Link from "next/link"

export default function EventsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <p className="text-sm text-gray-500 mt-1">
          Home / <span className="text-gray-700">Events</span>
        </p>
      </div>

      <div className="flex items-center gap-2 border-b">
        <Link
          href="/events"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 border-blue-600 text-blue-600"
        >
          <Calendar className="h-4 w-4" />
          Calendar
        </Link>
        <Link
          href="/events/list"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent"
        >
          <List className="h-4 w-4" />
          List
        </Link>
      </div>

      <CalendarView />
    </div>
  )
}
