import { getSchoolCourses, getCourseReferenceData } from "@/lib/supabase/queries/school-courses"
import { getSchoolBankDetails, getBankReferenceData } from "@/lib/supabase/queries/school-bank-details"
import { getSchoolVisits } from "@/lib/supabase/queries/school-visits"
import { getAttachmentsForMany } from "@/lib/supabase/queries/record-attachments"
import { SchoolCoursesSection } from "./school-courses"
import { SchoolBankDetailsSection } from "./school-bank-details"
import { SchoolVisitsSection } from "./school-visits"
import type { SchoolTabProps } from "./school-tab-content"

/** Loaders for the tabs behind the "More" menu; each fetches only its own rows. */

export async function CoursesTab({ schoolId, canWrite }: SchoolTabProps) {
  const [courses, referenceData] = await Promise.all([getSchoolCourses(schoolId), getCourseReferenceData()])
  return <SchoolCoursesSection schoolId={schoolId} courses={courses} referenceData={referenceData} canWrite={canWrite} />
}

export async function BankDetailsTab({ schoolId, canWrite }: SchoolTabProps) {
  const [bankDetails, referenceData] = await Promise.all([getSchoolBankDetails(schoolId), getBankReferenceData()])
  const attachments = await getAttachmentsForMany("school_bank_detail", bankDetails.map(b => b.id))
  return (
    <SchoolBankDetailsSection schoolId={schoolId} bankDetails={bankDetails} referenceData={referenceData}
      attachmentsByDetail={attachments} canWrite={canWrite} />
  )
}

export async function VisitsTab({ schoolId, canWrite }: SchoolTabProps) {
  const visits = await getSchoolVisits(schoolId)
  return <SchoolVisitsSection schoolId={schoolId} visits={visits} canWrite={canWrite} />
}
