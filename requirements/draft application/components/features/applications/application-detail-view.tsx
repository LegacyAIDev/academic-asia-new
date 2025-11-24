"use client"

import { useState } from "react"
import { ArrowLeft, Edit, Trash2, Mail, Calendar, FileText, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import type { Application } from "@/lib/dummy-data/applications"
import {
  getApplicationActivity,
  getStatusHistory,
  addActivity,
  addStatusHistory,
} from "@/lib/dummy-data/application-activity"
import { Timeline } from "./timeline"
import { StatusChangeDialog, type StatusChangeData } from "./status-change-dialog"
import { DUMMY_SCHOOLS } from "@/lib/dummy-data/schools"

interface ApplicationDetailViewProps {
  application: Application
}

export function ApplicationDetailView({ application }: ApplicationDetailViewProps) {
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const activities = getApplicationActivity(application.id)
  const statusHistory = getStatusHistory(application.id)
  const school = DUMMY_SCHOOLS.find((s) => s.id === application.schoolId)

  const handleStatusChange = (data: StatusChangeData) => {
    console.log("Status change:", data)

    // Add status history
    addStatusHistory({
      applicationId: application.id,
      fromStatus: application.enrolStatus,
      toStatus: data.newStatus,
      subStatus: data.subStatus,
      reason: data.reason,
      notes: data.notes,
      changedBy: "Current User", // In real app, get from auth
      changedAt: new Date().toISOString(),
      automated: false,
    })

    // Add activity
    addActivity({
      applicationId: application.id,
      type: "status_change",
      title: `Status changed to ${data.newStatus}`,
      description: data.reason,
      oldValue: application.enrolStatus,
      newValue: data.newStatus,
      createdBy: "Current User",
      createdAt: new Date().toISOString(),
    })

    // Trigger notifications if enabled
    if (data.sendNotification) {
      addActivity({
        applicationId: application.id,
        type: "email_sent",
        title: "Status change notification sent",
        description: `Email sent to student and ${application.assignedOfficer}`,
        createdBy: "System",
        createdAt: new Date().toISOString(),
      })
    }

    alert("Status updated successfully!")
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Offered":
        return "bg-green-50 text-green-700 border-green-200"
      case "Proceed":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "Awaiting Interview":
        return "bg-yellow-50 text-yellow-700 border-yellow-200"
      case "Cannot Proceed":
        return "bg-red-50 text-red-700 border-red-200"
      case "Withdrawn":
        return "bg-gray-50 text-gray-700 border-gray-200"
      case "Enrolled":
        return "bg-purple-50 text-purple-700 border-purple-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/applications">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Application {application.id}</h1>
            <p className="text-sm text-gray-500 mt-1">
              <Link href="/applications" className="hover:text-blue-600">
                Applications
              </Link>{" "}
              / <span className="text-gray-700">{application.id}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setShowStatusDialog(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Change Status
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/applications/${application.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Details
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Application Overview</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Complete application information and status</p>
                </div>
                <Badge variant="outline" className={getStatusColor(application.enrolStatus)}>
                  {application.enrolStatus}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Student & School */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Student Information</h4>
                  <div className="space-y-2">
                    <InfoRow
                      label="Student"
                      value={application.studentName}
                      link={`/students/${application.studentId}`}
                    />
                    <InfoRow label="Student ID" value={application.studentId} />
                    <InfoRow label="Assigned Officer" value={application.assignedOfficer} />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">School Information</h4>
                  <div className="space-y-2">
                    <InfoRow label="School" value={application.schoolName} link={`/schools/${application.schoolId}`} />
                    <InfoRow label="School ID" value={application.schoolId} />
                    {school && <InfoRow label="Location" value={`${school.city}, ${school.country}`} />}
                  </div>
                </div>
              </div>

              {/* Academic Details */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Academic Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label="Year Applying" value={application.applying} />
                  <InfoRow label="Entry Year" value={application.entryYear} />
                  <InfoRow label="Course Start Date" value={application.csd} />
                  <InfoRow label="Course Details" value={application.courseDetail || "N/A"} />
                  <InfoRow label="Referral" value={application.referral} />
                  <InfoRow label="Application Date" value={application.applicationDate} />
                </div>
              </div>

              {/* Status Details */}
              {application.subEnrolStatus && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Status Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow label="Sub-Status" value={application.subEnrolStatus} />
                    <InfoRow label="Last Updated" value={application.lastUpdated} />
                  </div>
                </div>
              )}

              {/* Interview/Event */}
              {(application.eventName || application.interviewDate) && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Interview & Event</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {application.eventName && <InfoRow label="Event" value={application.eventName} />}
                    {application.eventDate && <InfoRow label="Event Date" value={application.eventDate} />}
                    {application.interviewDate && <InfoRow label="Interview Date" value={application.interviewDate} />}
                    {application.interviewTime && <InfoRow label="Interview Time" value={application.interviewTime} />}
                    {application.interviewLocation && (
                      <InfoRow label="Location" value={application.interviewLocation} />
                    )}
                  </div>
                  {application.interviewNotes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Interview Notes</p>
                      <p className="text-sm text-gray-900">{application.interviewNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Scholarship */}
              {application.scholarshipApplied && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Scholarship Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow label="Scholarship Type" value={application.scholarshipType || "N/A"} />
                    <InfoRow label="Amount" value={application.scholarshipAmount || "N/A"} />
                  </div>
                </div>
              )}

              {/* Notes */}
              {application.notes && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700 font-semibold mb-2">Application Notes</p>
                  <p className="text-sm text-gray-900">{application.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline & History */}
          <Card>
            <CardContent className="p-0">
              <Tabs defaultValue="timeline">
                <div className="border-b border-gray-200 px-6">
                  <TabsList className="h-auto p-0 bg-transparent">
                    <TabsTrigger
                      value="timeline"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                    >
                      Activity Timeline
                    </TabsTrigger>
                    <TabsTrigger
                      value="history"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                    >
                      Status History
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-6">
                  <TabsContent value="timeline" className="mt-0">
                    <Timeline activities={activities} />
                  </TabsContent>

                  <TabsContent value="history" className="mt-0">
                    <div className="space-y-4">
                      {statusHistory.map((history, index) => (
                        <Card key={history.id} className="border-2">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {history.fromStatus ? (
                                  <>
                                    <Badge variant="outline" className="bg-gray-50">
                                      {history.fromStatus}
                                    </Badge>
                                    <span className="text-gray-400">→</span>
                                    <Badge variant="outline" className={getStatusColor(history.toStatus)}>
                                      {history.toStatus}
                                    </Badge>
                                  </>
                                ) : (
                                  <Badge variant="outline" className={getStatusColor(history.toStatus)}>
                                    {history.toStatus}
                                  </Badge>
                                )}
                              </div>
                              {history.automated && (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                  Automated
                                </Badge>
                              )}
                            </div>

                            {history.subStatus && (
                              <p className="text-sm text-gray-600 mb-2">Sub-status: {history.subStatus}</p>
                            )}

                            {history.reason && (
                              <p className="text-sm font-medium text-gray-900 mb-1">{history.reason}</p>
                            )}

                            {history.notes && (
                              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-2">{history.notes}</p>
                            )}

                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-3 pt-3 border-t">
                              <span className="font-medium">{history.changedBy}</span>
                              <span>•</span>
                              <span>
                                {new Date(history.changedAt).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start bg-transparent"
                onClick={() => setShowStatusDialog(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Change Status
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Interview
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <FileText className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </CardContent>
          </Card>

          {/* Progress Tracker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Application Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ProgressStep status="completed" title="Application Submitted" date={application.applicationDate} />
                <ProgressStep
                  status={
                    application.enrolStatus === "Awaiting Interview"
                      ? "current"
                      : ["Proceed", "Offered", "Enrolled"].includes(application.enrolStatus)
                        ? "completed"
                        : "pending"
                  }
                  title="Interview Scheduled"
                  date={application.interviewDate}
                />
                <ProgressStep
                  status={
                    ["Offered", "Enrolled"].includes(application.enrolStatus)
                      ? "completed"
                      : application.enrolStatus === "Proceed"
                        ? "current"
                        : "pending"
                  }
                  title="Under Review"
                />
                <ProgressStep
                  status={
                    application.enrolStatus === "Enrolled"
                      ? "completed"
                      : application.enrolStatus === "Offered"
                        ? "current"
                        : "pending"
                  }
                  title="Decision Received"
                />
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          {application.enrolStatus === "Offered" && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-gray-900">
                  • Confirm acceptance with family
                  <br />• Submit deposit payment
                  <br />• Complete enrollment paperwork
                  <br />• Schedule visa appointment (if needed)
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Status Change Dialog */}
      <StatusChangeDialog
        application={application}
        open={showStatusDialog}
        onOpenChange={setShowStatusDialog}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}

function InfoRow({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div className="flex justify-between items-start text-sm">
      <span className="text-gray-600 font-medium">{label}:</span>
      {link ? (
        <Link href={link} className="text-blue-600 hover:underline text-right">
          {value}
        </Link>
      ) : (
        <span className="text-gray-900 text-right">{value}</span>
      )}
    </div>
  )
}

function ProgressStep({
  status,
  title,
  date,
}: {
  status: "completed" | "current" | "pending"
  title: string
  date?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="relative">
        {status === "completed" ? (
          <div className="h-6 w-6 rounded-full bg-green-100 border-2 border-green-600 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-green-600" />
          </div>
        ) : status === "current" ? (
          <div className="h-6 w-6 rounded-full bg-blue-100 border-2 border-blue-600 flex items-center justify-center">
            <Clock className="h-3 w-3 text-blue-600" />
          </div>
        ) : (
          <div className="h-6 w-6 rounded-full bg-gray-100 border-2 border-gray-300" />
        )}
      </div>
      <div className="flex-1 pt-0.5">
        <p
          className={`text-sm font-medium ${status === "completed" ? "text-green-700" : status === "current" ? "text-blue-700" : "text-gray-500"}`}
        >
          {title}
        </p>
        {date && <p className="text-xs text-gray-500 mt-0.5">{date}</p>}
      </div>
    </div>
  )
}
