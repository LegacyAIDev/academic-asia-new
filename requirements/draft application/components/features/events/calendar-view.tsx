"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { getEventsByMonth } from "@/lib/dummy-data/events"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  const events = getEventsByMonth(currentYear, currentMonth)

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const isToday = (day: number) => {
    const today = new Date()
    return today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear
  }

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return events.filter((event) => {
      const eventStart = event.startDate
      const eventEnd = event.endDate
      return dateStr >= eventStart && dateStr <= eventEnd
    })
  }

  const getEventColor = (type: string) => {
    const colors: Record<string, string> = {
      Interview: "bg-blue-500",
      Assessment: "bg-purple-500",
      "School Visit": "bg-green-500",
      Fair: "bg-orange-500",
      Exam: "bg-yellow-500",
      Meeting: "bg-teal-500",
      Deadline: "bg-red-500",
      Holiday: "bg-gray-500",
    }
    return colors[type] || "bg-gray-500"
  }

  const calendarDays = []

  // Previous month's trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      isNextMonth: false,
    })
  }

  // Current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: true,
      isNextMonth: false,
    })
  }

  // Next month's leading days
  const remainingDays = 42 - calendarDays.length
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: false,
      isNextMonth: true,
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">
            {MONTHS[currentMonth]} {currentYear}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Link href="/events/new">
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Event
              </Button>
            </Link>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px rounded-lg border bg-muted">
          {/* Day headers */}
          {DAYS.map((day) => (
            <div key={day} className="bg-background p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((dayObj, index) => {
            const dayEvents = dayObj.isCurrentMonth ? getEventsForDay(dayObj.day) : []
            const isTodayDate = dayObj.isCurrentMonth && isToday(dayObj.day)

            return (
              <div
                key={index}
                className={`min-h-[100px] bg-background p-2 ${
                  !dayObj.isCurrentMonth ? "text-muted-foreground" : ""
                } ${isTodayDate ? "ring-2 ring-blue-500 ring-inset" : ""}`}
              >
                <div className={`mb-1 text-right text-sm font-medium ${isTodayDate ? "text-blue-600" : ""}`}>
                  {dayObj.day}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <Link key={event.id} href={`/events/${event.id}`}>
                      <div
                        className={`truncate rounded px-2 py-1 text-xs text-white transition-opacity hover:opacity-80 ${getEventColor(event.type)}`}
                      >
                        {event.startTime && <span className="mr-1">{event.startTime}</span>}
                        {event.title}
                      </div>
                    </Link>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-muted-foreground">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
