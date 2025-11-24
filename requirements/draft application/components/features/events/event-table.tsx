"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar, Clock, MapPin, Users, Search, Download, Eye, Edit, Columns } from "lucide-react"
import Link from "next/link"
import type { Event } from "@/types"
import { dummyStudents } from "@/lib/dummy-data/students"
import { dummySchools } from "@/lib/dummy-data/schools"

interface EventTableProps {
  events: Event[]
}

type SortField = "date" | "title" | "type" | "status"

const EVENT_TYPE_COLORS = {
  Interview: "bg-blue-100 text-blue-700",
  Assessment: "bg-purple-100 text-purple-700",
  "School Visit": "bg-green-100 text-green-700",
  Fair: "bg-orange-100 text-orange-700",
  Meeting: "bg-teal-100 text-teal-700",
  Deadline: "bg-red-100 text-red-700",
  Holiday: "bg-gray-100 text-gray-700",
  Exam: "bg-yellow-100 text-yellow-700",
}

const EVENT_STATUS_COLORS = {
  Scheduled: "bg-blue-100 text-blue-700",
  Completed: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
  Rescheduled: "bg-yellow-100 text-yellow-700",
}

export function EventTable({ events }: EventTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const [visibleColumns, setVisibleColumns] = useState({
    type: true,
    status: true,
    date: true,
    time: true,
    location: true,
    participants: true,
  })

  const filteredAndSortedEvents = useMemo(() => {
    const filtered = events.filter((event) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        event.title.toLowerCase().includes(searchLower) ||
        event.type.toLowerCase().includes(searchLower) ||
        event.location?.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower)

      if (!matchesSearch) return false

      // Type filter
      if (typeFilter !== "all" && event.type !== typeFilter) return false

      // Status filter
      if (statusFilter !== "all" && event.status !== statusFilter) return false

      // Location type filter
      if (locationFilter !== "all" && event.locationType !== locationFilter) return false

      // Date filter
      if (dateFilter !== "all") {
        const eventDate = new Date(event.startDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (dateFilter === "today") {
          const isToday =
            eventDate.getDate() === today.getDate() &&
            eventDate.getMonth() === today.getMonth() &&
            eventDate.getFullYear() === today.getFullYear()
          if (!isToday) return false
        } else if (dateFilter === "upcoming") {
          if (eventDate < today) return false
        } else if (dateFilter === "past") {
          if (eventDate >= today) return false
        }
      }

      return true
    })

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case "date":
          comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          break
        case "title":
          comparison = a.title.localeCompare(b.title)
          break
        case "type":
          comparison = a.type.localeCompare(b.type)
          break
        case "status":
          comparison = a.status.localeCompare(b.status)
          break
      }

      return sortDirection === "asc" ? comparison : -comparison
    })

    return filtered
  }, [events, searchQuery, typeFilter, statusFilter, locationFilter, dateFilter, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const exportToCSV = () => {
    const headers = [
      "ID",
      "Title",
      "Type",
      "Status",
      "Start Date",
      "End Date",
      "Start Time",
      "End Time",
      "Location",
      "Students",
      "Schools",
    ]
    const rows = filteredAndSortedEvents.map((event) => {
      const students = event.studentIds
        ?.map((id) => {
          const student = dummyStudents.find((s) => s.id === id)
          return student ? `${student.firstname} ${student.surname}` : ""
        })
        .join("; ")

      const schools = event.schoolIds
        ?.map((id) => {
          const school = dummySchools.find((s) => s.id === id)
          return school?.name || ""
        })
        .join("; ")

      return [
        event.id,
        `"${event.title}"`,
        event.type,
        event.status,
        event.startDate,
        event.endDate || "",
        event.startTime || "",
        event.endTime || "",
        `"${event.location || ""}"`,
        `"${students || ""}"`,
        `"${schools || ""}"`,
      ]
    })

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `events-export-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":")
    const hour = Number.parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Columns className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuCheckboxItem
                checked={visibleColumns.type}
                onCheckedChange={(checked) => setVisibleColumns((prev) => ({ ...prev, type: checked }))}
              >
                Type
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.status}
                onCheckedChange={(checked) => setVisibleColumns((prev) => ({ ...prev, status: checked }))}
              >
                Status
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.date}
                onCheckedChange={(checked) => setVisibleColumns((prev) => ({ ...prev, date: checked }))}
              >
                Date
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.time}
                onCheckedChange={(checked) => setVisibleColumns((prev) => ({ ...prev, time: checked }))}
              >
                Time
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.location}
                onCheckedChange={(checked) => setVisibleColumns((prev) => ({ ...prev, location: checked }))}
              >
                Location
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.participants}
                onCheckedChange={(checked) => setVisibleColumns((prev) => ({ ...prev, participants: checked }))}
              >
                Participants
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Interview">Interview</SelectItem>
              <SelectItem value="Assessment">Assessment</SelectItem>
              <SelectItem value="School Visit">School Visit</SelectItem>
              <SelectItem value="Fair">Fair</SelectItem>
              <SelectItem value="Exam">Exam</SelectItem>
              <SelectItem value="Meeting">Meeting</SelectItem>
              <SelectItem value="Deadline">Deadline</SelectItem>
              <SelectItem value="Holiday">Holiday</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Scheduled">Scheduled</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
              <SelectItem value="Rescheduled">Rescheduled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Location Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="Online">Online</SelectItem>
              <SelectItem value="In-Person">In-Person</SelectItem>
              <SelectItem value="Phone">Phone</SelectItem>
              <SelectItem value="TBD">TBD</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="past">Past</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-sm text-muted-foreground flex items-center justify-center">
            {filteredAndSortedEvents.length} events
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" className="h-8 px-2" onClick={() => handleSort("title")}>
                    Event
                    {sortField === "title" && (sortDirection === "asc" ? " ↑" : " ↓")}
                  </Button>
                </TableHead>
                {visibleColumns.type && (
                  <TableHead>
                    <Button variant="ghost" className="h-8 px-2" onClick={() => handleSort("type")}>
                      Type
                      {sortField === "type" && (sortDirection === "asc" ? " ↑" : " ↓")}
                    </Button>
                  </TableHead>
                )}
                {visibleColumns.status && (
                  <TableHead>
                    <Button variant="ghost" className="h-8 px-2" onClick={() => handleSort("status")}>
                      Status
                      {sortField === "status" && (sortDirection === "asc" ? " ↑" : " ↓")}
                    </Button>
                  </TableHead>
                )}
                {visibleColumns.date && (
                  <TableHead>
                    <Button variant="ghost" className="h-8 px-2" onClick={() => handleSort("date")}>
                      Date
                      {sortField === "date" && (sortDirection === "asc" ? " ↑" : " ↓")}
                    </Button>
                  </TableHead>
                )}
                {visibleColumns.time && <TableHead>Time</TableHead>}
                {visibleColumns.location && <TableHead>Location</TableHead>}
                {visibleColumns.participants && <TableHead>Participants</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No events found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Link href={`/events/${event.id}`} className="font-medium hover:underline">
                        {event.title}
                      </Link>
                      {event.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-xs">{event.description}</p>
                      )}
                    </TableCell>
                    {visibleColumns.type && (
                      <TableCell>
                        <Badge className={EVENT_TYPE_COLORS[event.type as keyof typeof EVENT_TYPE_COLORS]}>
                          {event.type}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.status && (
                      <TableCell>
                        <Badge className={EVENT_STATUS_COLORS[event.status as keyof typeof EVENT_STATUS_COLORS]}>
                          {event.status}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.date && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div className="text-sm">
                            <div>{formatDate(event.startDate)}</div>
                            {event.endDate && event.endDate !== event.startDate && (
                              <div className="text-muted-foreground">to {formatDate(event.endDate)}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.time && (
                      <TableCell>
                        {event.isAllDay ? (
                          <Badge variant="outline">All Day</Badge>
                        ) : (
                          event.startTime && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {formatTime(event.startTime)}
                                {event.endTime && ` - ${formatTime(event.endTime)}`}
                              </span>
                            </div>
                          )
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.location && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div className="text-sm">
                            <div>{event.location || "TBD"}</div>
                            <Badge variant="outline" className="mt-1">
                              {event.locationType}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.participants && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {(event.studentIds?.length || 0) + (event.schoolIds?.length || 0)} participants
                          </span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/events/${event.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/events/${event.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
