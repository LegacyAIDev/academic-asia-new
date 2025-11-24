import type React from "react"

// Event Types
export interface Event {
  id: string
  title: string
  type: "Interview" | "Assessment" | "School Visit" | "Fair" | "Exam" | "Meeting" | "Deadline" | "Holiday"
  status: "Scheduled" | "Completed" | "Cancelled" | "Rescheduled"
  startDate: string
  endDate?: string
  startTime?: string
  endTime?: string
  allDay?: boolean
  location?: string
  locationType?: "Online" | "In-Person" | "Phone" | "TBD"
  meetingUrl?: string
  description?: string
  studentIds?: string[]
  schoolIds?: string[]
  applicationIds?: string[]
  attendees?: string[]
  agenda?: string[]
  reminders?: number[]
  color?: string
  createdAt?: string
  updatedAt?: string
}

// Student Types
export interface Student {
  id: string
  firstname: string
  surname: string
  chineseName?: string
  dob: string
  gender: "Male" | "Female" | "Other"
  nationality: string
  passportNo?: string
  email: string
  phone: string
  address?: string
  city?: string
  country?: string
  currentSchool?: string
  currentYear?: string
  assignedOfficer?: string
  status: "Active" | "Inactive" | "Graduated"
  profilePicture?: string
  parentName?: string
  parentEmail?: string
  parentPhone?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// School Types
export interface School {
  id: string
  name: string
  type: "Boarding" | "Day" | "Both"
  gender: "Boys" | "Girls" | "Co-ed"
  country: string
  city: string
  address?: string
  website?: string
  email?: string
  phone?: string
  contactPerson?: string
  ageRange?: string
  curriculum?: string[]
  tuitionFees?: string
  boardingFees?: string
  totalStudents?: number
  description?: string
  logo?: string
  ranking?: number
  acceptanceRate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// Application Status Types
export type ApplicationStatus =
  | "In Progress"
  | "Submitted"
  | "Awaiting Interview"
  | "Interview Scheduled"
  | "Proceed"
  | "Offered"
  | "Enrolled"
  | "Cannot Proceed"
  | "Withdrawn"
  | "Rejected"

// Application Sub-Status Mapping
export const APPLICATION_SUB_STATUSES: Record<ApplicationStatus, string[]> = {
  "In Progress": ["Gathering Documents", "Completing Forms", "Awaiting References", "Preparing Essays"],
  Submitted: ["Under Review", "Additional Info Requested", "Pending Payment"],
  "Awaiting Interview": ["Interview Request Sent", "Scheduling Interview", "Preparing Student"],
  "Interview Scheduled": ["Confirmed", "Reminder Sent", "Awaiting Feedback"],
  Proceed: ["Assessment Scheduled", "Awaiting Decision", "Final Review"],
  Offered: ["Conditional Offer", "Unconditional Offer", "Awaiting Acceptance", "Deposit Paid"],
  Enrolled: ["Confirmed", "Visa Processing", "Pre-Departure"],
  "Cannot Proceed": [
    "Academic Requirements Not Met",
    "Age Not Suitable",
    "Language Requirements Not Met",
    "Full Capacity",
  ],
  Withdrawn: ["Student Decision", "Parent Decision", "Financial Reasons", "Alternative Accepted"],
  Rejected: ["Academic Reasons", "Behavioral Reasons", "Incomplete Application"],
}

// Application Interface
export interface Application {
  id: string
  studentId: string
  schoolId: string
  status: ApplicationStatus
  subStatus?: string
  submissionDate: string
  deadline?: string
  yearApplying: number
  entryYear?: string
  notes?: string
  interviewDate?: string
  interviewTime?: string
  interviewLocation?: string
  scholarshipRequested?: boolean
  scholarshipAmount?: string
  assignedOfficer?: string
  referralSource?: string
  priority?: "Low" | "Medium" | "High" | "Urgent"
  documents?: string[]
  createdAt: string
  updatedAt: string
}

// Application Activity Types
export type ActivityType =
  | "status_change"
  | "note_added"
  | "interview_scheduled"
  | "document_uploaded"
  | "email_sent"
  | "officer_assigned"

export interface ApplicationActivity {
  id: string
  applicationId: string
  type: ActivityType
  description: string
  previousStatus?: ApplicationStatus
  newStatus?: ApplicationStatus
  performedBy: string
  performedAt: string
  metadata?: Record<string, any>
}

// UI Component Types
export interface Stat {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bg: string
}

export interface StudentSearchForm {
  studentId: string
  surname: string
  firstName: string
  officer: string
  enrolStatus: string
  yearApply: string
  entryYear: string
  dob: string
  tel: string
  email: string
  saEvent: string
  eduCourse: string
}

export interface SchoolSearchForm {
  schoolId: string
  schoolName: string
}

export type TabValue = "today" | "weekly" | "exam" | "interview" | "reminders" | "followup" | "focus"
