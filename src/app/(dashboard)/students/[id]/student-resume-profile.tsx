"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText } from "lucide-react"
import { looksLikeHtml } from "@/lib/utils"
import { ResumeProfileDialog } from "./resume-profile-dialog"
import { ResumeTalentsSection } from "./resume-talents-section"
import { ResumeDocumentsSection } from "./resume-documents-section"
import { ResumeAATestsSection } from "./resume-aa-tests-section"
import type { ResumeProfileRecord, ResumeTalentRecord, StudentDocumentRecord } from "@/lib/supabase/queries/student-resume-profile"
import type { IndividualExamRecord } from "@/lib/supabase/queries/student-individual-exams"

type Props = {
  studentId: string
  profile: ResumeProfileRecord | null
  talents: ResumeTalentRecord[]
  documents: StudentDocumentRecord[]
  aaTests: IndividualExamRecord[]
}

const englishLabels: Record<string, { label: string; style: string }> = {
  fluent: { label: "Fluent", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  good: { label: "Good", style: "bg-blue-50 text-blue-700 border-blue-200" },
  not_good: { label: "Not Good", style: "bg-amber-50 text-amber-700 border-amber-200" },
}

export function StudentResumeProfileSection({ studentId, profile, talents, documents, aaTests }: Props) {
  const schoolReports = documents.filter(d => d.category?.code === "school_report")
  const examCerts = documents.filter(d => d.category?.code === "exam_certificate")
  const english = profile?.english_standard ? englishLabels[profile.english_standard] : null

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Resume
          </CardTitle>
          <ResumeProfileDialog studentId={studentId} profile={profile} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Section A — Profile */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">A — Profile</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">English Standard</p>
              {english ? (
                <Badge variant="outline" className={`${english.style} border text-xs font-medium`}>{english.label}</Badge>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Interests & Hobbies</p>
              <RichOrPlain value={profile?.interests_hobbies} />
            </div>
          </div>
        </div>

        <div className="border-t border-border/50" />

        {/* Section B — Academic */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">B — Academic</p>
          <ResumeAATestsSection studentId={studentId} aaTests={aaTests} />
          <ResumeDocumentsSection studentId={studentId} documents={schoolReports} categoryId={1} title="Current School Reports" />
          <ResumeDocumentsSection studentId={studentId} documents={examCerts} categoryId={2} title="External Exam Certificates" />
        </div>

        <div className="border-t border-border/50" />

        {/* Section C — Special Talents */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">C — Special Talents</p>
          <ResumeTalentsSection studentId={studentId} talents={talents} />
        </div>

        <div className="border-t border-border/50" />

        {/* Section D — Parents Input */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">D — Parents Input</p>
          <RichOrPlain value={profile?.parents_input} />
        </div>
      </CardContent>
    </Card>
  )
}

/** Render sanitized rich HTML, falling back to plain text for legacy values. */
function RichOrPlain({ value }: { value: string | null | undefined }) {
  if (!value) return <p className="text-sm text-muted-foreground">—</p>
  return looksLikeHtml(value) ? (
    // Sanitized on save in upsertStudentResumeProfile, safe to render
    <div className="rich-content" dangerouslySetInnerHTML={{ __html: value }} />
  ) : (
    <p className="text-sm whitespace-pre-wrap">{value}</p>
  )
}
