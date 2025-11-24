export interface ApplicationActivity {
  id: string
  applicationId: string
  type: "status_change" | "interview_scheduled" | "document_uploaded" | "note_added" | "email_sent" | "offer_received"
  title: string
  description?: string
  oldValue?: string
  newValue?: string
  createdBy: string
  createdAt: string
  metadata?: Record<string, any>
}

export interface ApplicationStatusHistory {
  id: string
  applicationId: string
  fromStatus: string
  toStatus: string
  subStatus?: string
  reason?: string
  notes?: string
  changedBy: string
  changedAt: string
  automated: boolean
}

export interface WorkflowRule {
  id: string
  name: string
  trigger: "status_change" | "time_based" | "manual"
  conditions: Record<string, any>
  actions: WorkflowAction[]
  enabled: boolean
}

export interface WorkflowAction {
  type: "send_email" | "create_task" | "update_status" | "send_notification"
  config: Record<string, any>
}

// Dummy activity data
export const DUMMY_APPLICATION_ACTIVITY: ApplicationActivity[] = [
  {
    id: "ACT001",
    applicationId: "APP001",
    type: "status_change",
    title: "Application created",
    description: "Application submitted for Year 10 entry",
    createdBy: "Jesse CHAN",
    createdAt: "2024-05-15T10:30:00Z",
  },
  {
    id: "ACT002",
    applicationId: "APP001",
    type: "document_uploaded",
    title: "Transcript uploaded",
    description: "Academic transcript for Year 9",
    createdBy: "Jesse CHAN",
    createdAt: "2024-05-16T14:20:00Z",
  },
  {
    id: "ACT003",
    applicationId: "APP001",
    type: "interview_scheduled",
    title: "Interview scheduled",
    description: "Online interview scheduled for 19-JUN-2025 at 10:00 AM",
    createdBy: "System",
    createdAt: "2024-05-20T09:00:00Z",
  },
  {
    id: "ACT004",
    applicationId: "APP001",
    type: "email_sent",
    title: "Interview confirmation sent",
    description: "Email sent to parent with interview details",
    createdBy: "System",
    createdAt: "2024-05-20T09:05:00Z",
  },
  {
    id: "ACT005",
    applicationId: "APP004",
    type: "status_change",
    title: "Status changed to Proceed",
    description: "Application moved to Proceed stage",
    oldValue: "Awaiting Interview",
    newValue: "Proceed",
    createdBy: "CHOW Hoi Sun Hayson",
    createdAt: "2025-03-16T11:30:00Z",
  },
  {
    id: "ACT006",
    applicationId: "APP004",
    type: "status_change",
    title: "Status changed to Offered",
    description: "Conditional offer received",
    oldValue: "Proceed",
    newValue: "Offered",
    createdBy: "CHOW Hoi Sun Hayson",
    createdAt: "2025-03-20T16:45:00Z",
  },
  {
    id: "ACT007",
    applicationId: "APP004",
    type: "offer_received",
    title: "Conditional offer",
    description: "25% academic scholarship awarded. Conditional on English improvement.",
    createdBy: "System",
    createdAt: "2025-03-20T16:45:00Z",
  },
]

export const DUMMY_STATUS_HISTORY: ApplicationStatusHistory[] = [
  {
    id: "HIST001",
    applicationId: "APP001",
    fromStatus: "",
    toStatus: "Awaiting Interview",
    changedBy: "Jesse CHAN",
    changedAt: "2024-05-15T10:30:00Z",
    automated: false,
  },
  {
    id: "HIST002",
    applicationId: "APP004",
    fromStatus: "",
    toStatus: "Awaiting Interview",
    changedBy: "CHOW Hoi Sun Hayson",
    changedAt: "2025-02-01T09:00:00Z",
    automated: false,
  },
  {
    id: "HIST003",
    applicationId: "APP004",
    fromStatus: "Awaiting Interview",
    toStatus: "Proceed",
    reason: "Interview completed successfully",
    notes: "Strong candidate, impressed by mathematics skills",
    changedBy: "CHOW Hoi Sun Hayson",
    changedAt: "2025-03-16T11:30:00Z",
    automated: false,
  },
  {
    id: "HIST004",
    applicationId: "APP004",
    fromStatus: "Proceed",
    toStatus: "Offered",
    subStatus: "Conditional Offer",
    reason: "Offer received from school",
    notes: "25% scholarship awarded. Conditional on English grade improvement to B+",
    changedBy: "CHOW Hoi Sun Hayson",
    changedAt: "2025-03-20T16:45:00Z",
    automated: false,
  },
  {
    id: "HIST005",
    applicationId: "APP005",
    fromStatus: "",
    toStatus: "Awaiting Interview",
    changedBy: "CHOW Jamie Haole",
    changedAt: "2024-12-10T10:00:00Z",
    automated: false,
  },
  {
    id: "HIST006",
    applicationId: "APP005",
    fromStatus: "Awaiting Interview",
    toStatus: "Cannot Proceed",
    subStatus: "Failed Entrance Exam",
    reason: "Did not meet minimum entry requirements",
    notes: "Student scored below threshold in both English and Mathematics entrance exams",
    changedBy: "CHOW Jamie Haole",
    changedAt: "2025-01-25T15:30:00Z",
    automated: false,
  },
]

// Helper functions
export function getApplicationActivity(applicationId: string): ApplicationActivity[] {
  return DUMMY_APPLICATION_ACTIVITY.filter((activity) => activity.applicationId === applicationId).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export function getStatusHistory(applicationId: string): ApplicationStatusHistory[] {
  return DUMMY_STATUS_HISTORY.filter((history) => history.applicationId === applicationId).sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
  )
}

export function addActivity(activity: Omit<ApplicationActivity, "id">): ApplicationActivity {
  const newActivity: ApplicationActivity = {
    ...activity,
    id: `ACT${Date.now()}`,
  }
  DUMMY_APPLICATION_ACTIVITY.push(newActivity)
  return newActivity
}

export function addStatusHistory(history: Omit<ApplicationStatusHistory, "id">): ApplicationStatusHistory {
  const newHistory: ApplicationStatusHistory = {
    ...history,
    id: `HIST${Date.now()}`,
  }
  DUMMY_STATUS_HISTORY.push(newHistory)
  return newHistory
}
