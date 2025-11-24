"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  School,
  Calendar,
  TrendingUp,
  Clock,
  AlertCircle,
  Search,
  Plus,
  ArrowRight,
  FileText,
  CheckCircle,
  Bell,
} from "lucide-react"
import Link from "next/link"
import { dummyStudents } from "@/lib/dummy-data/students"
import { DUMMY_SCHOOLS } from "@/lib/dummy-data/schools"
import { DUMMY_APPLICATIONS } from "@/lib/dummy-data/applications"
import { dummyEvents, getUpcomingEvents } from "@/lib/dummy-data/events"

export function DashboardOverview() {
  const [searchQuery, setSearchQuery] = useState("")

  // Calculate statistics
  const totalStudents = dummyStudents.length
  const activeStudents = dummyStudents.filter((s) => s.status === "Active").length
  const totalApplications = DUMMY_APPLICATIONS.length
  const offeredApplications = DUMMY_APPLICATIONS.filter((a) => a.status === "Offered").length
  const upcomingEvents = getUpcomingEvents(5)
  const todayEvents = dummyEvents.filter((e) => {
    const today = new Date()
    const eventDate = new Date(e.startDate)
    return (
      eventDate.getDate() === today.getDate() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getFullYear() === today.getFullYear()
    )
  })

  // Get recent applications
  const recentApplications = DUMMY_APPLICATIONS.slice(0, 5)

  // Get applications needing follow-up (deadlines within 2 weeks)
  const followUpApplications = DUMMY_APPLICATIONS.filter((app) => {
    if (!app.deadline) return false
    const deadline = new Date(app.deadline)
    const twoWeeksFromNow = new Date()
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14)
    return deadline <= twoWeeksFromNow && deadline >= new Date()
  }).slice(0, 5)

  const getStudentById = (id: string) => dummyStudents.find((s) => s.id === id)
  const getSchoolById = (id: string) => DUMMY_SCHOOLS.find((s) => s.id === id)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Offered: "bg-green-100 text-green-700",
      Enrolled: "bg-blue-100 text-blue-700",
      "In Progress": "bg-yellow-100 text-yellow-700",
      Submitted: "bg-purple-100 text-purple-700",
      "Awaiting Interview": "bg-orange-100 text-orange-700",
      "Cannot Proceed": "bg-red-100 text-red-700",
    }
    return colors[status] || "bg-gray-100 text-gray-700"
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back! Here's your overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/events/new">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Event
            </Link>
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" asChild>
            <Link href="/applications/new">
              <Plus className="h-4 w-4 mr-2" />
              New Application
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Quick search: student name, ID, school..."
              className="pl-10 text-lg h-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Link href="/students">
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Students
              </Button>
            </Link>
            <Link href="/schools">
              <Button variant="outline" size="sm">
                <School className="h-4 w-4 mr-2" />
                Schools
              </Button>
            </Link>
            <Link href="/applications">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Applications
              </Button>
            </Link>
            <Link href="/events">
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Events
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">{activeStudents} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalApplications}</div>
            <p className="text-xs text-muted-foreground">{offeredApplications} offered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Events</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayEvents.length}</div>
            <p className="text-xs text-muted-foreground">{upcomingEvents.length} upcoming</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalApplications > 0 ? Math.round((offeredApplications / totalApplications) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Offer rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="today">Today's Focus</TabsTrigger>
          <TabsTrigger value="followup">Follow Up</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Schedule */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Today's Schedule</CardTitle>
                    <CardDescription>{formatDate(new Date().toISOString())}</CardDescription>
                  </div>
                  <Link href="/events">
                    <Button variant="ghost" size="sm">
                      View All
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {todayEvents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No events scheduled for today</p>
                  </div>
                ) : (
                  todayEvents.map((event) => (
                    <Link
                      href={`/events/${event.id}`}
                      key={event.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 mt-2 rounded-full bg-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{event.title}</p>
                        <p className="text-sm text-gray-500">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {event.startTime} - {event.endTime}
                        </p>
                        {event.location && <p className="text-sm text-gray-500 truncate">{event.location}</p>}
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 flex-shrink-0">{event.type}</Badge>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Recent Applications */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Applications</CardTitle>
                    <CardDescription>Latest updates</CardDescription>
                  </div>
                  <Link href="/applications">
                    <Button variant="ghost" size="sm">
                      View All
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentApplications.map((app) => {
                  const student = getStudentById(app.studentId)
                  const school = getSchoolById(app.schoolId)
                  if (!student || !school) return null

                  return (
                    <Link
                      href={`/applications/${app.id}`}
                      key={app.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={student.profilePicture || "/placeholder.svg"} />
                        <AvatarFallback>
                          {student.firstname[0]}
                          {student.surname[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">
                          {student.firstname} {student.surname}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{school.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getStatusColor(app.status)}>{app.status}</Badge>
                          {app.deadline && (
                            <span className="text-xs text-gray-500">
                              <Clock className="inline h-3 w-3 mr-1" />
                              {formatDate(app.deadline)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Upcoming Events</CardTitle>
                  <CardDescription>Next 5 scheduled events</CardDescription>
                </div>
                <Link href="/events">
                  <Button variant="ghost" size="sm">
                    View Calendar
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <Link
                    href={`/events/${event.id}`}
                    key={event.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{new Date(event.startDate).getDate()}</div>
                        <div className="text-xs text-gray-500 uppercase">
                          {new Date(event.startDate).toLocaleDateString("en-US", { month: "short" })}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{event.title}</p>
                        <p className="text-sm text-gray-500">
                          {event.startTime} - {event.location}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700">{event.type}</Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Today's Focus Tab */}
        <TabsContent value="today" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Action Items
                </CardTitle>
                <CardDescription>Tasks requiring attention today</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg border-l-4 border-orange-500 bg-orange-50">
                  <p className="font-medium text-gray-900">3 Interview preparations due</p>
                  <p className="text-sm text-gray-600 mt-1">Students need prep materials sent</p>
                </div>
                <div className="p-3 rounded-lg border-l-4 border-red-500 bg-red-50">
                  <p className="font-medium text-gray-900">2 Application deadlines this week</p>
                  <p className="text-sm text-gray-600 mt-1">Final submissions needed</p>
                </div>
                <div className="p-3 rounded-lg border-l-4 border-blue-500 bg-blue-50">
                  <p className="font-medium text-gray-900">5 Follow-up calls scheduled</p>
                  <p className="text-sm text-gray-600 mt-1">Parent consultations today</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Recent Updates
                </CardTitle>
                <CardDescription>Latest status changes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Jack HO received offer from Winchester</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Sophie WONG interview scheduled for Monday</p>
                    <p className="text-xs text-gray-500">5 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Emma LEE application submitted to Eton</p>
                    <p className="text-xs text-gray-500">Yesterday</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Follow Up Tab */}
        <TabsContent value="followup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-orange-600" />
                Applications Requiring Follow-Up
              </CardTitle>
              <CardDescription>Deadlines within the next 2 weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {followUpApplications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No urgent follow-ups needed</p>
                  </div>
                ) : (
                  followUpApplications.map((app) => {
                    const student = getStudentById(app.studentId)
                    const school = getSchoolById(app.schoolId)
                    if (!student || !school) return null

                    const daysUntilDeadline = Math.ceil(
                      (new Date(app.deadline!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                    )

                    return (
                      <Link
                        href={`/applications/${app.id}`}
                        key={app.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={student.profilePicture || "/placeholder.svg"} />
                            <AvatarFallback>
                              {student.firstname[0]}
                              {student.surname[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">
                              {student.firstname} {student.surname}
                            </p>
                            <p className="text-sm text-gray-500 truncate">{school.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getStatusColor(app.status)}>{app.status}</Badge>
                              <Badge
                                variant="outline"
                                className={
                                  daysUntilDeadline <= 7
                                    ? "border-red-300 text-red-700"
                                    : "border-orange-300 text-orange-700"
                                }
                              >
                                {daysUntilDeadline} days left
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{formatDate(app.deadline!)}</p>
                          <p className="text-xs text-gray-500">Deadline</p>
                        </div>
                      </Link>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {DUMMY_APPLICATIONS.filter((a) => a.status === "In Progress").length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Active applications</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Awaiting Decisions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {DUMMY_APPLICATIONS.filter((a) => a.status === "Submitted" || a.status === "Proceed").length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Pending results</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Successful</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {DUMMY_APPLICATIONS.filter((a) => a.status === "Offered" || a.status === "Enrolled").length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Offers & enrolled</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Applications</CardTitle>
              <CardDescription>Quick overview of all student applications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {DUMMY_APPLICATIONS.slice(0, 10).map((app) => {
                  const student = getStudentById(app.studentId)
                  const school = getSchoolById(app.schoolId)
                  if (!student || !school) return null

                  return (
                    <Link
                      href={`/applications/${app.id}`}
                      key={app.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={student.profilePicture || "/placeholder.svg"} />
                          <AvatarFallback className="text-xs">
                            {student.firstname[0]}
                            {student.surname[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {student.firstname} {student.surname}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{school.name}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(app.status)}>{app.status}</Badge>
                    </Link>
                  )
                })}
              </div>
              <div className="mt-4 text-center">
                <Link href="/applications">
                  <Button variant="outline">
                    View All Applications
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
