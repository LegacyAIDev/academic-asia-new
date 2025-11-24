export interface Application {
  id: string
  studentId: string
  studentName: string
  schoolId: string
  schoolName: string

  // Application Details
  yearApply: string
  applying: string // Year level
  courseDetail: string
  csd: string // Course Start Date
  entryYear: string

  // Status & Progress
  enrolStatus: "Awaiting Interview" | "Proceed" | "Offered" | "Cannot Proceed" | "Withdrawn" | "Enrolled"
  subEnrolStatus?: string
  referral: "Yes" | "No"

  // Event/Interview
  eventId?: string
  eventName?: string
  eventDate?: string
  interviewDate?: string
  interviewTime?: string
  interviewLocation?: string
  interviewNotes?: string

  // Additional Info
  applicationDate: string
  lastUpdated: string
  notes?: string
  documents?: string[]

  // Scholarship
  scholarshipApplied: boolean
  scholarshipType?: string
  scholarshipAmount?: string

  // Officer
  assignedOfficer: string
}

export interface ApplicationStatusHistory {
  id: string
  applicationId: string
  status: string
  subStatus?: string
  changedBy: string
  changedDate: string
  notes?: string
}

// Dummy Applications Data
export const DUMMY_APPLICATIONS: Application[] = [
  {
    id: "APP001",
    studentId: "S044751",
    studentName: "Jesse CHAN (LAU Waythan Wai Fung)",
    schoolId: "SCH001",
    schoolName: "Eton College",
    yearApply: "Year 10 (2026)",
    applying: "Year 10",
    courseDetail: "",
    csd: "Sep-2026",
    entryYear: "2026",
    enrolStatus: "Awaiting Interview",
    referral: "No",
    eventName: "EX - Early Online Interviews and Placement",
    eventDate: "19-JUN-2025",
    applicationDate: "15-MAY-2024",
    lastUpdated: "16-MAY-2025",
    scholarshipApplied: false,
    assignedOfficer: "Jesse CHAN",
  },
  {
    id: "APP002",
    studentId: "S044751",
    studentName: "Jesse CHAN (LAU Waythan Wai Fung)",
    schoolId: "SCH005",
    schoolName: "Brighton College",
    yearApply: "Year 10 (2026)",
    applying: "Year 10",
    courseDetail: "",
    csd: "Sep-2026",
    entryYear: "2026",
    enrolStatus: "Awaiting Interview",
    referral: "No",
    eventName: "EX - Early Online Interviews and Placement",
    eventDate: "20-JUN-2025",
    applicationDate: "15-MAY-2024",
    lastUpdated: "16-MAY-2025",
    scholarshipApplied: false,
    assignedOfficer: "Jesse CHAN",
  },
  {
    id: "APP003",
    studentId: "S044751",
    studentName: "Jesse CHAN (LAU Waythan Wai Fung)",
    schoolId: "SCH003",
    schoolName: "Rugby School",
    yearApply: "Year 10 (2026)",
    applying: "Year 10",
    courseDetail: "",
    csd: "Sep-2026",
    entryYear: "2026",
    enrolStatus: "Proceed",
    subEnrolStatus: "Pending Documents",
    referral: "No",
    eventName: "TS - TOP SCHOOLS WEEKEND",
    eventDate: "22-SEP-2024",
    applicationDate: "10-MAY-2024",
    lastUpdated: "25-SEP-2024",
    scholarshipApplied: false,
    assignedOfficer: "Jesse CHAN",
  },
  {
    id: "APP004",
    studentId: "S043033",
    studentName: "Jack HO",
    schoolId: "SCH002",
    schoolName: "Harrow School",
    yearApply: "Year 9 (2026)",
    applying: "Year 9",
    courseDetail: "",
    csd: "Sep-2026",
    entryYear: "2026",
    enrolStatus: "Offered",
    subEnrolStatus: "Conditional Offer",
    referral: "Yes",
    eventName: "In-Person Assessment Day",
    eventDate: "15-MAR-2025",
    interviewDate: "15-MAR-2025",
    interviewTime: "10:00 AM",
    interviewLocation: "School Campus",
    applicationDate: "01-FEB-2025",
    lastUpdated: "20-MAR-2025",
    notes: "Strong performance in mathematics. Conditional on English improvement.",
    scholarshipApplied: true,
    scholarshipType: "Academic",
    scholarshipAmount: "25%",
    assignedOfficer: "CHOW Hoi Sun Hayson",
  },
  {
    id: "APP005",
    studentId: "S043623",
    studentName: "Jack HO",
    schoolId: "SCH004",
    schoolName: "Wycombe Abbey School",
    yearApply: "Year 9 (2026)",
    applying: "Year 9",
    courseDetail: "",
    csd: "Sep-2026",
    entryYear: "2026",
    enrolStatus: "Cannot Proceed",
    subEnrolStatus: "Failed Entrance Exam",
    referral: "No",
    eventName: "January Assessment",
    eventDate: "20-JAN-2025",
    applicationDate: "10-DEC-2024",
    lastUpdated: "25-JAN-2025",
    notes: "Student did not meet minimum entry requirements.",
    scholarshipApplied: false,
    assignedOfficer: "CHOW Jamie Haole",
  },
]

// Get applications by student ID
export function getApplicationsByStudent(studentId: string): Application[] {
  return DUMMY_APPLICATIONS.filter((app) => app.studentId === studentId)
}

// Get applications by school ID
export function getApplicationsBySchool(schoolId: string): Application[] {
  return DUMMY_APPLICATIONS.filter((app) => app.schoolId === schoolId)
}

// Get application by ID
export function getApplicationById(id: string): Application | undefined {
  return DUMMY_APPLICATIONS.find((app) => app.id === id)
}
