import type { Event } from "@/types"

export interface EventTemplate {
  id: string
  name: string
  type: Event["type"]
  defaultDuration: number
  defaultLocation: string
  defaultAgenda?: string[]
  color: string
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: "template-interview",
    name: "School Interview",
    type: "Interview",
    defaultDuration: 60,
    defaultLocation: "Online",
    defaultAgenda: [
      "Introduction and welcome",
      "Academic background discussion",
      "Extracurricular activities",
      "Student questions",
      "Next steps explanation",
    ],
    color: "blue",
  },
  {
    id: "template-assessment",
    name: "Entrance Assessment",
    type: "Assessment",
    defaultDuration: 120,
    defaultLocation: "Testing Center",
    defaultAgenda: [
      "Student arrival and registration",
      "Assessment instructions",
      "Written examination",
      "Break",
      "Verbal assessment",
    ],
    color: "purple",
  },
  {
    id: "template-school-visit",
    name: "School Visit",
    type: "School Visit",
    defaultDuration: 180,
    defaultLocation: "School Campus",
    defaultAgenda: [
      "Campus arrival and check-in",
      "Tour of facilities",
      "Meeting with admissions",
      "Q&A session",
      "Lunch with current students",
    ],
    color: "green",
  },
  {
    id: "template-fair",
    name: "Education Fair",
    type: "Fair",
    defaultDuration: 480,
    defaultLocation: "Convention Center",
    defaultAgenda: [
      "Setup exhibition booth",
      "Morning session presentations",
      "Networking lunch",
      "Afternoon consultations",
      "Closing and wrap-up",
    ],
    color: "orange",
  },
  {
    id: "template-meeting",
    name: "Parent Meeting",
    type: "Meeting",
    defaultDuration: 45,
    defaultLocation: "Office",
    defaultAgenda: [
      "Welcome and introductions",
      "Review student progress",
      "Discuss school options",
      "Address parent concerns",
      "Set action items and next steps",
    ],
    color: "teal",
  },
]

export const dummyEvents: Event[] = [
  {
    id: "EVT001",
    title: "Team Planning Meeting",
    type: "Meeting",
    status: "Scheduled",
    startDate: "2025-10-23",
    endDate: "2025-10-23",
    startTime: "14:00",
    endTime: "15:30",
    duration: 90,
    location: "Main Office, Conference Room A",
    locationType: "In-Person",
    description: "Monthly team planning and review meeting",
    isAllDay: false,
    staffMembers: ["John Smith", "Sarah Johnson"],
    agenda: [
      "Review last month's applications",
      "Discuss upcoming school visits",
      "Plan Q4 strategy",
      "Address team concerns",
    ],
    reminders: [7, 1],
    createdAt: "2025-10-01T10:00:00Z",
    updatedAt: "2025-10-01T10:00:00Z",
    createdBy: "Admin",
    color: "teal",
  },
  {
    id: "EVT002",
    title: "Winchester College Interview",
    type: "Interview",
    status: "Scheduled",
    startDate: "2025-10-24",
    endDate: "2025-10-24",
    startTime: "10:00",
    endTime: "11:00",
    duration: 60,
    location: "Online via Zoom",
    locationType: "Online",
    meetingUrl: "https://zoom.us/j/12345678",
    description: "Interview for Year 9 entry",
    isAllDay: false,
    studentIds: ["S044751"],
    schoolIds: ["SCH001"],
    applicationIds: ["APP001"],
    staffMembers: ["Michael Brown"],
    agenda: [
      "Introduction and welcome",
      "Academic background discussion",
      "Extracurricular activities",
      "Student questions",
      "Next steps explanation",
    ],
    reminders: [3, 1],
    createdAt: "2025-10-15T09:00:00Z",
    updatedAt: "2025-10-15T09:00:00Z",
    createdBy: "Michael Brown",
    color: "blue",
  },
  {
    id: "EVT003",
    title: "UK Boarding Schools Fair",
    type: "Fair",
    status: "Scheduled",
    startDate: "2025-10-25",
    endDate: "2025-10-25",
    startTime: "09:00",
    endTime: "17:00",
    duration: 480,
    location: "London Convention Centre",
    locationType: "In-Person",
    description: "Annual UK boarding schools exhibition",
    isAllDay: false,
    schoolIds: ["SCH001", "SCH002", "SCH003"],
    staffMembers: ["John Smith", "Sarah Johnson", "Michael Brown"],
    agenda: [
      "Setup exhibition booth",
      "Morning session presentations",
      "Networking lunch",
      "Afternoon consultations",
      "Closing and wrap-up",
    ],
    reminders: [14, 7, 1],
    createdAt: "2025-09-01T10:00:00Z",
    updatedAt: "2025-09-01T10:00:00Z",
    createdBy: "Admin",
    color: "orange",
  },
  {
    id: "EVT004",
    title: "Parent Consultation",
    type: "Meeting",
    status: "Scheduled",
    startDate: "2025-10-26",
    endDate: "2025-10-26",
    startTime: "15:00",
    endTime: "15:45",
    duration: 45,
    location: "Office - Room 3",
    locationType: "In-Person",
    description: "Progress review with parents",
    isAllDay: false,
    studentIds: ["S043033"],
    staffMembers: ["Sarah Johnson"],
    agenda: ["Review application progress", "Discuss school options", "Address parent concerns", "Set action items"],
    reminders: [7, 1],
    createdAt: "2025-10-10T11:00:00Z",
    updatedAt: "2025-10-10T11:00:00Z",
    createdBy: "Sarah Johnson",
    color: "teal",
  },
  {
    id: "EVT005",
    title: "Abingdon School Interview",
    type: "Interview",
    status: "Scheduled",
    startDate: "2025-10-28",
    endDate: "2025-10-28",
    startTime: "11:00",
    endTime: "12:00",
    duration: 60,
    location: "Abingdon School Campus",
    locationType: "In-Person",
    description: "On-campus interview and tour",
    isAllDay: false,
    studentIds: ["S043623"],
    schoolIds: ["SCH002"],
    applicationIds: ["APP003"],
    staffMembers: ["Michael Brown"],
    agenda: [
      "Campus arrival and check-in",
      "Tour of facilities",
      "Interview with admissions",
      "Q&A session",
      "Wrap-up and next steps",
    ],
    reminders: [7, 3, 1],
    createdAt: "2025-10-12T14:00:00Z",
    updatedAt: "2025-10-12T14:00:00Z",
    createdBy: "Michael Brown",
    color: "blue",
  },
  {
    id: "EVT006",
    title: "Brighton College Interview",
    type: "Interview",
    status: "Scheduled",
    startDate: "2025-10-29",
    endDate: "2025-10-29",
    startTime: "14:00",
    endTime: "15:00",
    duration: 60,
    location: "Online via Microsoft Teams",
    locationType: "Online",
    meetingUrl: "https://teams.microsoft.com/l/meetup-join/abc123",
    description: "Virtual interview session",
    isAllDay: false,
    studentIds: ["S044850"],
    schoolIds: ["SCH003"],
    applicationIds: ["APP004"],
    staffMembers: ["John Smith"],
    agenda: ["Technical check", "Introduction", "Academic discussion", "School fit assessment", "Next steps"],
    reminders: [3, 1],
    createdAt: "2025-10-18T10:30:00Z",
    updatedAt: "2025-10-18T10:30:00Z",
    createdBy: "John Smith",
    color: "blue",
  },
  {
    id: "EVT007",
    title: "Rugby School Entrance Exam",
    type: "Exam",
    status: "Scheduled",
    startDate: "2025-10-30",
    endDate: "2025-10-30",
    startTime: "09:00",
    endTime: "12:00",
    duration: 180,
    location: "Testing Center - Room 201",
    locationType: "In-Person",
    description: "Common Entrance Examination",
    isAllDay: false,
    studentIds: ["S045123"],
    schoolIds: ["SCH004"],
    applicationIds: ["APP005"],
    staffMembers: ["Sarah Johnson"],
    agenda: [
      "Student arrival and registration",
      "Exam instructions",
      "Mathematics paper (60 min)",
      "English paper (60 min)",
      "Science paper (60 min)",
    ],
    reminders: [14, 7, 3, 1],
    createdAt: "2025-09-15T09:00:00Z",
    updatedAt: "2025-09-15T09:00:00Z",
    createdBy: "Sarah Johnson",
    color: "yellow",
  },
  {
    id: "EVT008",
    title: "Eton College Application Deadline",
    type: "Deadline",
    status: "Scheduled",
    startDate: "2025-10-31",
    endDate: "2025-10-31",
    startTime: "23:59",
    endTime: "23:59",
    location: "Online Submission",
    locationType: "Online",
    description: "Final deadline for Eton College applications",
    isAllDay: true,
    studentIds: ["S044751", "S043033"],
    schoolIds: ["SCH005"],
    applicationIds: ["APP006"],
    staffMembers: ["John Smith"],
    agenda: ["Verify all documents uploaded", "Confirm payment received", "Submit application"],
    reminders: [30, 14, 7, 3, 1],
    createdAt: "2025-08-01T10:00:00Z",
    updatedAt: "2025-08-01T10:00:00Z",
    createdBy: "Admin",
    color: "red",
  },
]

let eventCounter = dummyEvents.length + 1

export function addEvent(eventData: Omit<Event, "id" | "createdAt" | "updatedAt">): Event {
  const newEvent: Event = {
    ...eventData,
    id: `EVT${String(eventCounter).padStart(3, "0")}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  eventCounter++
  dummyEvents.push(newEvent)

  return newEvent
}

export function getEventById(id: string): Event | undefined {
  return dummyEvents.find((event) => event.id === id)
}

export function getEventsByStudentId(studentId: string): Event[] {
  return dummyEvents.filter((event) => event.studentIds?.includes(studentId))
}

export function getEventsBySchoolId(schoolId: string): Event[] {
  return dummyEvents.filter((event) => event.schoolIds?.includes(schoolId))
}

export function getEventsByApplicationId(applicationId: string): Event[] {
  return dummyEvents.filter((event) => event.applicationIds?.includes(applicationId))
}

export function getEventsByDateRange(startDate: string, endDate: string): Event[] {
  return dummyEvents.filter((event) => {
    const eventDate = new Date(event.startDate)
    const start = new Date(startDate)
    const end = new Date(endDate)
    return eventDate >= start && eventDate <= end
  })
}

export function getEventsByMonth(year: number, month: number): Event[] {
  return dummyEvents.filter((event) => {
    const eventDate = new Date(event.startDate)
    return eventDate.getFullYear() === year && eventDate.getMonth() === month
  })
}

export function getUpcomingEvents(limit?: number): Event[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcoming = dummyEvents
    .filter((event) => new Date(event.startDate) >= today)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

  return limit ? upcoming.slice(0, limit) : upcoming
}
