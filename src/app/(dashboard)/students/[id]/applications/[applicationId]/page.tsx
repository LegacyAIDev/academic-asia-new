import { notFound } from "next/navigation"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { canAccess, requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"
import { getApplicationReferenceData, getStudentApplicationById } from "@/lib/supabase/queries/student-applications"
import { getApplicationBookings } from "@/lib/supabase/queries/application-bookings"
import { getApplicationStatusHistory } from "@/lib/supabase/queries/application-status-history"
import { getAttachmentsForMany } from "@/lib/supabase/queries/record-attachments"
import { getStudentById } from "@/lib/supabase/queries/students"
import { buildApplicationTimeline } from "@/lib/applications/application-timeline"
import { isUuid } from "@/lib/scheduler/uuid"
import { RecordNotes } from "@/components/features/record-notes"
import { getRecordNotes, getSignedInUserId } from "@/lib/supabase/queries/record-notes"
import { ApplicationHeader } from "./application-header"
import { ApplicationJourney } from "./application-journey"
import { ApplicationRecordSections } from "./application-record-sections"
import { ApplicationSubRecords } from "./application-sub-records"
import { ApplicationStudentCard } from "./application-student-card"
import { ApplicationStatusControl } from "./application-status-control"
import { ApplicationTimeline } from "./application-timeline"

type Props = { params: Promise<{ id: string; applicationId: string }> }

/**
 * One school application on its own page: the student, where the application
 * stands on the journey, the full record, its sub-records and a dated timeline.
 * Staff with write access change the status here by hand (customer item 7).
 */
export default async function StudentApplicationPage({ params }: Props) {
  await requireAccess(MODULES.STUDENTS)
  const { id: studentId, applicationId } = await params
  if (!isUuid(studentId) || !isUuid(applicationId)) notFound()

  const [canWrite, canSeeBookings, canSeeExamNotes, canWriteExamNotes, application, student] = await Promise.all([
    canAccess(MODULES.STUDENTS, ACCESS.WRITE),
    canAccess(MODULES.SCHEDULER),
    canAccess(MODULES.EXAMS),
    canAccess(MODULES.EXAMS, ACCESS.WRITE),
    getStudentApplicationById(applicationId, studentId),
    getStudentById(studentId),
  ])
  if (!application || !student) notFound()

  const [bookings, statusChanges, attachments, depositAttachments, referenceData, notes, currentUserId] = await Promise.all([
    canSeeBookings ? getApplicationBookings(application.id) : null,
    getApplicationStatusHistory(application.id),
    getAttachmentsForMany("student_application", [application.id]),
    canWrite ? getAttachmentsForMany("student_deposit", application.deposits.map(d => d.id)) : null,
    canWrite ? getApplicationReferenceData() : null,
    getRecordNotes("application", applicationId),
    getSignedInUserId(),
  ])
  const applicationAttachments = attachments.get(application.id) ?? []
  const timeline = buildApplicationTimeline(application, bookings ?? [], statusChanges)
  // Newest first, so the first change into the current status is when it was reached (sub-status-only changes skipped).
  const statusSince = statusChanges.find(change =>
    change.to_status_id === application.status_id && change.from_status_id !== change.to_status_id)?.changed_at ?? null

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/students">Students</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/students/${student.id}?tab=applications`}>{student.first_name} {student.surname}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{application.school?.name ?? "Application"}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <ApplicationHeader
        application={application}
        student={student}
        edit={referenceData && depositAttachments ? {
          referenceData,
          attachments: applicationAttachments,
          attachmentsByDeposit: depositAttachments,
        } : null}
      />

      <ApplicationJourney status={application.status} since={statusSince} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ApplicationRecordSections application={application} />
          <ApplicationSubRecords
            application={application}
            bookings={bookings}
            attachments={applicationAttachments}
            examNotes={canSeeExamNotes ? { canWrite: canWriteExamNotes, currentUserId } : null}
          />
        </div>
        <div className="space-y-4">
          {referenceData && (
            <ApplicationStatusControl
              // Remounts after any status change, including one made in the edit dialog.
              key={`${application.status_id}-${application.sub_status_id}`}
              applicationId={application.id}
              studentId={student.id}
              status={application.status}
              subStatus={application.sub_status}
              statuses={referenceData.statuses}
              subStatuses={referenceData.subStatuses}
            />
          )}
          <ApplicationStudentCard student={student} />
          <RecordNotes
            target="application"
            recordId={application.id}
            initialNotes={notes.notes}
            more={notes.more}
            canWrite={canWrite}
            currentUserId={currentUserId}
          />
          <ApplicationTimeline entries={timeline} />
        </div>
      </div>
    </div>
  )
}
