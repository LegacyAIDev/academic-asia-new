"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  GraduationCap,
  User,
  ExternalLink,
  Edit,
  Bell,
  FileText,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"
import type { Event } from "@/types"
import { dummyStudents } from "@/lib/dummy-data/students"
import { dummySchools } from "@/lib/dummy-data/schools"

interface EventDetailViewProps {
  event: Event
}

const EVENT_TYPE_COLORS = {
  Interview: "bg-blue-100 text-blue-700 border-blue-300",
  Assessment: "bg-purple-100 text-purple-700 border-purple-300",
  "School Visit": "bg-green-100 text-green-700 border-green-300",
  Fair: "bg-orange-100 text-orange-700 border-orange-300",
  Meeting: "bg-teal-100 text-teal-700 border-teal-300",
  Deadline: "bg-red-100 text-red-700 border-red-300",
  Holiday: "bg-gray-100 text-gray-700 border-gray-300",
  Exam: "bg-yellow-100 text-yellow-700 border-yellow-300",
}

const EVENT_STATUS_COLORS = {
  Scheduled: "bg-blue-100 text-blue-700",
  Completed: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
  Rescheduled: "bg-yellow-100 text-yellow-700",
}

export function EventDetailView({ event }: EventDetailViewProps) {
  const participants = event.studentIds?.map((id) => dummyStudents.find((s) => s.id === id)).filter(Boolean) || []

  const schools = event.schoolIds?.map((id) => dummySchools.find((s) => s.id === id)).filter(Boolean) || []

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/events">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
            <p className="text-muted-foreground">{event.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/events/${event.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Status and Type Badges */}
      <div className="flex items-center gap-2">
        <Badge className={EVENT_TYPE_COLORS[event.type as keyof typeof EVENT_TYPE_COLORS]}>{event.type}</Badge>
        <Badge className={EVENT_STATUS_COLORS[event.status as keyof typeof EVENT_STATUS_COLORS]}>{event.status}</Badge>
        {event.isAllDay && <Badge variant="outline">All Day</Badge>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="participants">Participants</TabsTrigger>
              <TabsTrigger value="agenda">Agenda</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Event Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Date & Time */}
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Date</p>
                      <p className="text-sm text-muted-foreground">{formatDate(event.startDate)}</p>
                      {event.endDate && event.endDate !== event.startDate && (
                        <p className="text-sm text-muted-foreground">to {formatDate(event.endDate)}</p>
                      )}
                    </div>
                  </div>

                  {!event.isAllDay && event.startTime && (
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Time</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(event.startTime)}
                          {event.endTime && ` - ${formatTime(event.endTime)}`}
                        </p>
                        {event.duration && (
                          <p className="text-xs text-muted-foreground">Duration: {event.duration} minutes</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">{event.location || "TBD"}</p>
                      <Badge variant="outline" className="mt-1">
                        {event.locationType}
                      </Badge>
                      {event.meetingUrl && (
                        <div className="mt-2">
                          <Button variant="outline" size="sm" asChild>
                            <a href={event.meetingUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Join Online Meeting
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {event.description && (
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Description</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{event.description}</p>
                      </div>
                    </div>
                  )}

                  {/* Reminders */}
                  {event.reminders && event.reminders.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Reminders</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {event.reminders.map((days, index) => (
                            <Badge key={index} variant="outline">
                              {days === 1 ? "1 day before" : `${days} days before`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="participants" className="space-y-4">
              {/* Students */}
              {participants.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Students ({participants.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {participants.map((student) => (
                        <Link
                          key={student?.id}
                          href={`/students/${student?.id}`}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                        >
                          <Avatar>
                            <AvatarImage
                              src={student?.avatar || "/placeholder.svg"}
                              alt={`${student?.firstname} ${student?.surname}`}
                            />
                            <AvatarFallback>
                              {student?.firstname?.[0]}
                              {student?.surname?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">
                              {student?.firstname} {student?.surname}
                            </p>
                            <p className="text-sm text-muted-foreground">{student?.email}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Schools */}
              {schools.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Schools ({schools.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {schools.map((school) => (
                        <Link
                          key={school?.id}
                          href={`/schools/${school?.id}`}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={school?.logo || "/placeholder.svg"} alt={school?.name} />
                            <AvatarFallback>{school?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{school?.name}</p>
                            <p className="text-sm text-muted-foreground">{school?.location}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Staff */}
              {event.staffMembers && event.staffMembers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Staff Members ({event.staffMembers.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {event.staffMembers.map((staff, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{staff}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="agenda" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Agenda / Checklist</CardTitle>
                  <CardDescription>Items to cover during this event</CardDescription>
                </CardHeader>
                <CardContent>
                  {event.agenda && event.agenda.length > 0 ? (
                    <div className="space-y-2">
                      {event.agenda.map((item, index) => (
                        <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent">
                          <CheckCircle2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No agenda items yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                <Link href={`/events/${event.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Event
                </Link>
              </Button>
              {event.meetingUrl && (
                <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                  <a href={event.meetingUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Join Meeting
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Related Applications */}
          {event.applicationIds && event.applicationIds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Related Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {event.applicationIds.map((appId) => (
                    <Button key={appId} variant="outline" className="w-full justify-start bg-transparent" asChild>
                      <Link href={`/applications/${appId}`}>
                        <FileText className="h-4 w-4 mr-2" />
                        View Application
                      </Link>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
