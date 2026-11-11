import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getStudentById, getStudentContacts, getContactReferenceData } from "@/lib/supabase/queries/students"
import { getFamilyLinksToStudent, getFamilySuggestions } from "@/lib/supabase/queries/student-family"
import { getStudentApplications, getApplicationReferenceData } from "@/lib/supabase/queries/student-applications"
import { getStudentEducation, getEducationReferenceData } from "@/lib/supabase/queries/student-education"
import { getStudentVisas, getVisaReferenceData } from "@/lib/supabase/queries/student-visas"
import { getStudentEventApplications, getEventAppReferenceData } from "@/lib/supabase/queries/student-event-applications"
import { getStudentTravel, getTravelReferenceData } from "@/lib/supabase/queries/student-travel"
import { getStudentExamResults, getExamResultReferenceData } from "@/lib/supabase/queries/student-exam-results"
import { getStudentBriefIntro, getBriefIntroReferenceData } from "@/lib/supabase/queries/student-brief-intro"
import { getStudentResume, getResumeReferenceData } from "@/lib/supabase/queries/student-resume"
import { getStudentResumeProfile, getStudentResumeTalents, getStudentDocuments } from "@/lib/supabase/queries/student-resume-profile"
import { getStudentAATests } from "@/lib/supabase/queries/student-individual-exams"
import { getStudentInternalNotes } from "@/lib/supabase/queries/student-internal-notes"
import { getStudentSectionCounts } from "@/lib/supabase/queries/student-sections"
import { getActivity, MAX_ACTIVITY } from "@/lib/supabase/queries/activity-log"
import { getRecordNotes, getSignedInUserId } from "@/lib/supabase/queries/record-notes"
import { getStudentLegacyLogMeta } from "@/lib/supabase/queries/student-log-book"
import { getAttachmentsForMany } from "@/lib/supabase/queries/record-attachments"
import { canAccess, requireAccess } from "@/lib/permissions/guard"
import { ACCESS, MODULES } from "@/lib/permissions/modules"
import { RecordNotes } from "@/components/features/record-notes"
import { CommunicationsSection } from "@/components/features/communications/communications-section"
import { ActivityHistory } from "@/components/features/activity-history"
import { StudentCalendarSection } from "./student-calendar-section"
import { StudentFamilySection } from "./student-family"
import { StudentApplicationsSection } from "./student-applications"
import { StudentEducationSection } from "./student-education"
import { StudentVisasSection } from "./student-visas"
import { StudentEventApplicationsSection } from "./student-event-applications"
import { StudentTravelSection } from "./student-travel"
import { StudentExamResultsSection } from "./student-exam-results"
import { StudentBriefIntroSection } from "./student-brief-intro"
import { StudentResumeProfileSection } from "./student-resume-profile"
import { StudentResumeSection } from "./student-resume"
import { StudentInternalNotesSection } from "./student-internal-notes"
import { StudentLegacyLog } from "./student-legacy-log"
import { StudentLegalDocumentsSection } from "./student-legal-documents"
import { StudentDocumentsSection } from "./student-documents-section"
import { StudentDetailsPanel } from "./student-details-panel"
import { StudentHeaderActions } from "./student-header-actions"
import { StudentSectionBar } from "./student-section-bar"
import { sectionFromParam } from "./student-sections"
import { STUDENT_NOTES_ANCHOR } from "./quick-add-note-button"

const statusStyles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  new: "bg-sky-50 text-sky-700 ring-sky-600/15",
  pending: "bg-amber-50 text-amber-800 ring-amber-600/20",
  closed: "bg-slate-100 text-slate-600 ring-slate-500/15",
  dead: "bg-rose-50 text-rose-700 ring-rose-600/15",
}

const longDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })

/** Whole years between a date of birth and today (Hong Kong). */
function age(dateOfBirth: string): number | null {
  const born = new Date(`${dateOfBirth.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(born.getTime())) return null
  const now = new Date(Date.now() + 8 * 3600000)
  let years = now.getUTCFullYear() - born.getUTCFullYear()
  if (now.getUTCMonth() < born.getUTCMonth() || (now.getUTCMonth() === born.getUTCMonth() && now.getUTCDate() < born.getUTCDate())) years -= 1
  return years
}

type StudentDetailPageParams = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; from?: string }>
}

/**
 * One student: a compact header with every action (Add opens each kind of
 * record's form straight away), a section bar that stays in view, and only the
 * open section's data loaded.
 */
export default async function StudentDetailPage({ params, searchParams }: StudentDetailPageParams) {
  await requireAccess(MODULES.STUDENTS)
  const { id } = await params
  const query = await searchParams
  const section = sectionFromParam(query.tab)

  const [student, canWrite, counts, contacts] = await Promise.all([
    getStudentById(id),
    canAccess(MODULES.STUDENTS, ACCESS.WRITE),
    getStudentSectionCounts(id),
    // The header's "Email parent" needs the family; the Family section reuses it.
    getStudentContacts(id),
  ])
  if (!student) notFound()

  const name = [student.first_name, student.surname].filter(Boolean).join(" ") || "Unnamed student"
  // AA mainly emails parents/guardians: offer the highest-priority contact with an email.
  const parentContact = [...contacts]
    .filter(c => c.email_1 || c.email_2 || c.email_3)
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))[0]
  const parent = parentContact
    ? { name: [parentContact.first_name, parentContact.surname].filter(Boolean).join(" "), email: (parentContact.email_1 || parentContact.email_2 || parentContact.email_3) as string }
    : null
  const years = student.date_of_birth ? age(student.date_of_birth) : null
  const consultant = student.assigned_profile ? [student.assigned_profile.first_name, student.assigned_profile.surname].filter(Boolean).join(" ") : null
  const facts = [
    student.date_of_birth ? `Born ${longDate.format(new Date(`${student.date_of_birth.slice(0, 10)}T00:00:00Z`))}${years !== null ? ` (${years})` : ""}` : null,
    student.nationality?.label ?? null,
    student.gender === "M" ? "Male" : student.gender === "F" ? "Female" : student.gender,
    consultant ? `Consultant: ${consultant}` : "No consultant assigned",
  ].filter(Boolean) as string[]

  return (
    <div className="mx-auto max-w-[1320px]">
      <Link href="/students" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Students
      </Link>

      <header className="mt-3 flex flex-col gap-4 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">{name}</h1>
            {student.chinese_name && <span className="text-xl text-muted-foreground">{student.chinese_name}</span>}
            {student.status && (
              <Badge variant="outline" className={`border-0 font-medium ring-1 ring-inset ${statusStyles[student.status.code] ?? statusStyles.closed}`}>
                {student.status.label}
              </Badge>
            )}
            {student.placement && <Badge variant="outline" className="font-medium">{student.placement.label} lead</Badge>}
          </div>
          <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="font-mono text-foreground/80">{student.student_code ?? "No code"}</span>
            {facts.map(fact => <span key={fact}>{fact}</span>)}
          </p>
        </div>
        <StudentHeaderActions
          studentId={id}
          studentName={name}
          section={section}
          canWrite={canWrite}
          parent={parent}
          studentEmail={student.email}
        />
      </header>

      <StudentSectionBar studentId={id} current={section} counts={counts} />

      <div className="pt-6">
        <Section id={id} section={section} canWrite={canWrite} student={student} contacts={contacts} name={name} calendarFrom={query.from} />
      </div>
    </div>
  )
}

type Student = NonNullable<Awaited<ReturnType<typeof getStudentById>>>
type Contacts = Awaited<ReturnType<typeof getStudentContacts>>

/** The open section, loading only its own data. */
async function Section({ id, section, canWrite, student, contacts, name, calendarFrom }: {
  id: string
  section: ReturnType<typeof sectionFromParam>
  canWrite: boolean
  student: Student
  contacts: Contacts
  name: string
  calendarFrom?: string
}) {
  switch (section) {
    case "overview": {
      const [briefIntro, briefIntroReferenceData, internalNotes, recordNotes, currentUserId, legacyLog, activity, examPaperAttachments] = await Promise.all([
        getStudentBriefIntro(id), getBriefIntroReferenceData(), getStudentInternalNotes(id),
        getRecordNotes("student", id), getSignedInUserId(), getStudentLegacyLogMeta(id),
        getActivity({ studentId: id }), getAttachmentsForMany("student_exam_paper", [id]),
      ])
      return (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="grid min-w-0 gap-6 lg:col-span-2">
            <RecordNotes
              target="student" recordId={id} initialNotes={recordNotes.notes} more={recordNotes.more}
              canWrite={canWrite} currentUserId={currentUserId} anchorId={STUDENT_NOTES_ANCHOR}
            />
            <StudentInternalNotesSection studentId={id} notes={internalNotes} canWrite={canWrite} />
            <StudentBriefIntroSection studentId={id} briefIntro={briefIntro} referenceData={briefIntroReferenceData} canWrite={canWrite} />
            <ActivityHistory entries={activity} limit={MAX_ACTIVITY} />
          </div>
          {/* On phones the contact details come first; on desktop they sit on the right. */}
          <div className="order-first grid min-w-0 gap-6 lg:order-none">
            <StudentDetailsPanel student={student} examPaperAttachments={examPaperAttachments.get(id) ?? []} canWrite={canWrite} />
            {legacyLog && (
              <StudentLegacyLog
                studentId={id}
                lastUpdate={legacyLog.legacy_last_update ? longDate.format(new Date(legacyLog.legacy_last_update)) : null}
              />
            )}
          </div>
        </div>
      )
    }
    case "applications": {
      const [applications, referenceData] = await Promise.all([getStudentApplications(id), getApplicationReferenceData()])
      const depositIds = applications.flatMap(a => (a.deposits ?? []).map(d => d.id))
      const [byApplication, byDeposit] = await Promise.all([
        getAttachmentsForMany("student_application", applications.map(a => a.id)),
        getAttachmentsForMany("student_deposit", depositIds),
      ])
      return (
        <StudentApplicationsSection
          studentId={id} applications={applications} referenceData={referenceData}
          attachmentsByApplication={byApplication} attachmentsByDeposit={byDeposit} canWrite={canWrite}
        />
      )
    }
    case "family": {
      const [referenceData, links, suggestions] = await Promise.all([
        getContactReferenceData(), getFamilyLinksToStudent(id),
        // Suggestions only help someone who can link them.
        canWrite ? getFamilySuggestions(id) : Promise.resolve([]),
      ])
      return (
        <StudentFamilySection
          studentId={id} student={student} contacts={contacts} linksToStudent={links} suggestions={suggestions}
          referenceData={referenceData} studentAddress={student.address_line_1} canWrite={canWrite}
        />
      )
    }
    case "education": {
      const [education, eduReference, examResults, examReference] = await Promise.all([
        getStudentEducation(id), getEducationReferenceData(), getStudentExamResults(id), getExamResultReferenceData(),
      ])
      const examAttachments = await getAttachmentsForMany("student_exam_result", examResults.map(r => r.id))
      return (
        <div className="grid gap-6">
          <StudentEducationSection studentId={id} educationEntries={education} referenceData={eduReference} canWrite={canWrite} />
          <StudentExamResultsSection studentId={id} examResults={examResults} referenceData={examReference} attachmentsByResult={examAttachments} canWrite={canWrite} />
        </div>
      )
    }
    case "resume": {
      const [profile, talents, documents, aaTests, entries, referenceData] = await Promise.all([
        getStudentResumeProfile(id), getStudentResumeTalents(id), getStudentDocuments(id, "resume"),
        getStudentAATests(id), getStudentResume(id), getResumeReferenceData(),
      ])
      const attachments = await getAttachmentsForMany("student_qualification", entries.map(r => r.id))
      return (
        <div className="grid gap-6">
          <StudentResumeProfileSection studentId={id} profile={profile} talents={talents} documents={documents} aaTests={aaTests} canWrite={canWrite} />
          <StudentResumeSection studentId={id} resumeEntries={entries} referenceData={referenceData} attachmentsByResume={attachments} canWrite={canWrite} />
        </div>
      )
    }
    case "documents":
      return <StudentDocumentsSection studentId={id} documents={await getStudentDocuments(id)} canWrite={canWrite} />
    case "communications":
      return <CommunicationsSection context={{ kind: "student", student: { id, name } }} />
    case "events": {
      const [applications, referenceData] = await Promise.all([getStudentEventApplications(id), getEventAppReferenceData()])
      return <StudentEventApplicationsSection studentId={id} applications={applications} referenceData={referenceData} canWrite={canWrite} />
    }
    case "calendar":
      return <StudentCalendarSection studentId={id} canBook={await canAccess(MODULES.SCHEDULER, ACCESS.WRITE)} start={calendarFrom} />
    case "immigration": {
      const [visas, visaReference, legalDocuments, travel, travelReference] = await Promise.all([
        getStudentVisas(id), getVisaReferenceData(id), getStudentDocuments(id, "legal_documents"),
        getStudentTravel(id), getTravelReferenceData(),
      ])
      const [visaAttachments, travelAttachments] = await Promise.all([
        getAttachmentsForMany("student_visa", visas.map(v => v.id)),
        getAttachmentsForMany("student_travel", travel.map(t => t.id)),
      ])
      return (
        <div className="grid gap-6">
          <StudentVisasSection studentId={id} visas={visas} referenceData={visaReference} attachmentsByVisa={visaAttachments} canWrite={canWrite} />
          <StudentLegalDocumentsSection
            studentId={id} passportType={student.passport_type} passportNumber={student.passport_number}
            documents={legalDocuments} canWrite={canWrite}
          />
          <StudentTravelSection studentId={id} travelRecords={travel} referenceData={travelReference} attachmentsByTravel={travelAttachments} canWrite={canWrite} />
        </div>
      )
    }
  }
}
