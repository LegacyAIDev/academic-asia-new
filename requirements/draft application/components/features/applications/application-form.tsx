"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { dummyStudents } from "@/lib/dummy-data/students"
import { dummySchools } from "@/lib/dummy-data/schools"
import { type Application, type ApplicationStatus, APPLICATION_SUB_STATUSES } from "@/types"

interface ApplicationFormProps {
  application?: Application
  mode: "create" | "edit"
}

export function ApplicationForm({ application, mode }: ApplicationFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    studentId: application?.studentId || "",
    schoolId: application?.schoolId || "",
    status: application?.status || ("In Progress" as ApplicationStatus),
    subStatus: application?.subStatus || "",
    submissionDate: application?.submissionDate || new Date().toISOString().split("T")[0],
    deadline: application?.deadline || "",
    yearApplying: application?.yearApplying || new Date().getFullYear() + 1,
    entryYear: application?.entryYear || "",
    notes: application?.notes || "",
    interviewDate: application?.interviewDate || "",
    interviewTime: application?.interviewTime || "",
    interviewLocation: application?.interviewLocation || "",
    scholarshipRequested: application?.scholarshipRequested || false,
    scholarshipAmount: application?.scholarshipAmount || "",
    assignedOfficer: application?.assignedOfficer || "",
    referralSource: application?.referralSource || "",
    priority: application?.priority || "Medium",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // In real app, would save to database here
    console.log("Saving application:", formData)

    // Redirect based on mode
    if (mode === "create") {
      router.push("/applications")
    } else {
      router.push(`/applications/${application?.id}`)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const subStatusOptions = formData.status ? APPLICATION_SUB_STATUSES[formData.status] || [] : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/applications">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {mode === "create" ? "New Application" : "Edit Application"}
            </h1>
            <p className="text-muted-foreground">
              {mode === "create" ? "Create a new school application" : "Update application details"}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Student and school details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="studentId">Student *</Label>
                  <Select value={formData.studentId} onValueChange={(value) => handleChange("studentId", value)}>
                    <SelectTrigger id="studentId">
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {dummyStudents.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.firstname} {student.surname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolId">School *</Label>
                  <Select value={formData.schoolId} onValueChange={(value) => handleChange("schoolId", value)}>
                    <SelectTrigger id="schoolId">
                      <SelectValue placeholder="Select school" />
                    </SelectTrigger>
                    <SelectContent>
                      {dummySchools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yearApplying">Year Applying For *</Label>
                  <Input
                    id="yearApplying"
                    type="number"
                    value={formData.yearApplying}
                    onChange={(e) => handleChange("yearApplying", Number.parseInt(e.target.value))}
                    min={new Date().getFullYear()}
                    max={new Date().getFullYear() + 5}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="entryYear">Entry Year Group</Label>
                  <Input
                    id="entryYear"
                    placeholder="e.g., Year 9, 9th Grade"
                    value={formData.entryYear}
                    onChange={(e) => handleChange("entryYear", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status & Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Status & Timeline</CardTitle>
              <CardDescription>Application progress and important dates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange("status", value as ApplicationStatus)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Submitted">Submitted</SelectItem>
                      <SelectItem value="Awaiting Interview">Awaiting Interview</SelectItem>
                      <SelectItem value="Interview Scheduled">Interview Scheduled</SelectItem>
                      <SelectItem value="Proceed">Proceed</SelectItem>
                      <SelectItem value="Offered">Offered</SelectItem>
                      <SelectItem value="Enrolled">Enrolled</SelectItem>
                      <SelectItem value="Cannot Proceed">Cannot Proceed</SelectItem>
                      <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {subStatusOptions.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="subStatus">Sub-Status</Label>
                    <Select value={formData.subStatus} onValueChange={(value) => handleChange("subStatus", value)}>
                      <SelectTrigger id="subStatus">
                        <SelectValue placeholder="Select sub-status" />
                      </SelectTrigger>
                      <SelectContent>
                        {subStatusOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => handleChange("priority", value)}>
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="submissionDate">Submission Date</Label>
                  <Input
                    id="submissionDate"
                    type="date"
                    value={formData.submissionDate}
                    onChange={(e) => handleChange("submissionDate", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">Application Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => handleChange("deadline", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interview Details */}
          <Card>
            <CardHeader>
              <CardTitle>Interview Details</CardTitle>
              <CardDescription>Interview scheduling information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interviewDate">Interview Date</Label>
                  <Input
                    id="interviewDate"
                    type="date"
                    value={formData.interviewDate}
                    onChange={(e) => handleChange("interviewDate", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interviewTime">Interview Time</Label>
                  <Input
                    id="interviewTime"
                    type="time"
                    value={formData.interviewTime}
                    onChange={(e) => handleChange("interviewTime", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interviewLocation">Location</Label>
                  <Input
                    id="interviewLocation"
                    placeholder="e.g., Online, Campus, Office"
                    value={formData.interviewLocation}
                    onChange={(e) => handleChange("interviewLocation", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
              <CardDescription>Scholarship, officer assignment, and other details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assignedOfficer">Assigned Officer</Label>
                  <Input
                    id="assignedOfficer"
                    placeholder="Officer name"
                    value={formData.assignedOfficer}
                    onChange={(e) => handleChange("assignedOfficer", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referralSource">Referral Source</Label>
                  <Input
                    id="referralSource"
                    placeholder="How did they find us?"
                    value={formData.referralSource}
                    onChange={(e) => handleChange("referralSource", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="scholarshipRequested"
                      checked={formData.scholarshipRequested}
                      onChange={(e) => handleChange("scholarshipRequested", e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="scholarshipRequested" className="font-normal cursor-pointer">
                      Scholarship Requested
                    </Label>
                  </div>
                </div>

                {formData.scholarshipRequested && (
                  <div className="space-y-2">
                    <Label htmlFor="scholarshipAmount">Scholarship Amount</Label>
                    <Input
                      id="scholarshipAmount"
                      placeholder="e.g., 50%, £10,000"
                      value={formData.scholarshipAmount}
                      onChange={(e) => handleChange("scholarshipAmount", e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes about this application..."
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/applications">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.studentId || !formData.schoolId}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? "Saving..." : mode === "create" ? "Create Application" : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
