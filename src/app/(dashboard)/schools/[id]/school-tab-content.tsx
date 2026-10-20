import { canAccess } from "@/lib/permissions/guard"
import { EXAM_PAPER_ACCESS } from "@/lib/attachments/exam-paper-access"
import type { SchoolTabKey } from "@/lib/schools/school-tabs"
import type { SchoolWithJoins } from "@/lib/supabase/queries/schools"
import { getAttachmentsForMany } from "@/lib/supabase/queries/record-attachments"
import { getSchoolFees, getFeeReferenceData } from "@/lib/supabase/queries/school-fees"
import { getSchoolEntranceExams, getEntranceExamReferenceData } from "@/lib/supabase/queries/school-entrance-exams"
import { getSchoolAcademicResults, getAcademicResultReferenceData } from "@/lib/supabase/queries/school-academic-results"
import { getSchoolNotes, getNoteReferenceData } from "@/lib/supabase/queries/school-notes"
import { getSchoolContacts } from "@/lib/supabase/queries/school-contacts"
import { getSchoolEvents } from "@/lib/supabase/queries/events"
import { getSchoolDocuments } from "@/lib/supabase/queries/school-documents"
import { SchoolOverview } from "./school-overview"
import { SchoolFeesSection } from "./school-fees"
import { SchoolEntranceExamsSection } from "./school-entrance-exams"
import { SchoolAcademicResultsSection } from "./school-academic-results"
import { SchoolNotesSection } from "./school-notes"
import { SchoolContactsSection } from "./school-contacts"
import { SchoolEventsSection } from "./school-events"
import { SchoolDocumentsSection } from "./school-documents"
import { SchoolSupplementaryInfo } from "./school-supplementary-info"
import { BankDetailsTab, CoursesTab, VisitsTab } from "./school-tab-content-more"

export type SchoolTabProps = {
  schoolId: string
  school: SchoolWithJoins
  canWrite: boolean
  /** Page of the supplementary information list on the "Notes & Info" tab. */
  supPage: number
}

/**
 * One loader per tab of the school page. Only the open tab's loader runs, so
 * opening a school no longer fetches every section (about thirty queries) to
 * show one of them.
 */

async function EntranceExamsTab({ schoolId, canWrite }: SchoolTabProps) {
  const [exams, referenceData, canManagePapers] = await Promise.all([
    getSchoolEntranceExams(schoolId),
    getEntranceExamReferenceData(),
    canAccess(EXAM_PAPER_ACCESS.module, EXAM_PAPER_ACCESS.write),
  ])
  const attachments = await getAttachmentsForMany("school_entrance_exam_paper", exams.map(e => e.id))
  return (
    <SchoolEntranceExamsSection schoolId={schoolId} exams={exams} referenceData={referenceData}
      attachmentsByExam={attachments} canWrite={canWrite} canManagePapers={canManagePapers} />
  )
}

async function FeesTab({ schoolId, canWrite }: SchoolTabProps) {
  const [fees, referenceData] = await Promise.all([getSchoolFees(schoolId), getFeeReferenceData()])
  const attachments = await getAttachmentsForMany("school_fee", fees.map(f => f.id))
  return <SchoolFeesSection schoolId={schoolId} fees={fees} referenceData={referenceData} attachmentsByFee={attachments} canWrite={canWrite} />
}

async function AcademicResultsTab({ schoolId, canWrite }: SchoolTabProps) {
  const [results, referenceData] = await Promise.all([getSchoolAcademicResults(schoolId), getAcademicResultReferenceData()])
  return <SchoolAcademicResultsSection schoolId={schoolId} results={results} referenceData={referenceData} canWrite={canWrite} />
}

async function ContactsTab({ schoolId, canWrite }: SchoolTabProps) {
  const contacts = await getSchoolContacts(schoolId)
  return <SchoolContactsSection schoolId={schoolId} contacts={contacts} canWrite={canWrite} />
}

async function EventsTab({ schoolId }: SchoolTabProps) {
  return <SchoolEventsSection events={await getSchoolEvents(schoolId)} />
}

/** Notes and the supplementary information, which the customer's prototype keeps on one tab. */
async function NotesTab({ schoolId, canWrite, supPage }: SchoolTabProps) {
  const [notes, referenceData] = await Promise.all([getSchoolNotes(schoolId), getNoteReferenceData()])
  const attachments = await getAttachmentsForMany("school_note", notes.map(n => n.id))
  return (
    <div className="space-y-6">
      <SchoolNotesSection schoolId={schoolId} notes={notes} referenceData={referenceData} attachmentsByNote={attachments} canWrite={canWrite} />
      <SchoolSupplementaryInfo schoolId={schoolId} page={supPage} canWrite={canWrite} />
    </div>
  )
}

async function DocumentsTab({ schoolId, canWrite }: SchoolTabProps) {
  return <SchoolDocumentsSection schoolId={schoolId} documents={await getSchoolDocuments(schoolId)} canWrite={canWrite} />
}

async function OverviewTab({ school }: SchoolTabProps) {
  return <SchoolOverview school={school} />
}

export const SCHOOL_TAB_CONTENT: Record<SchoolTabKey, (props: SchoolTabProps) => Promise<React.ReactElement>> = {
  basic: OverviewTab,
  "entrance-exams": EntranceExamsTab,
  fees: FeesTab,
  "academic-results": AcademicResultsTab,
  contacts: ContactsTab,
  events: EventsTab,
  notes: NotesTab,
  documents: DocumentsTab,
  courses: CoursesTab,
  "bank-details": BankDetailsTab,
  visits: VisitsTab,
}
