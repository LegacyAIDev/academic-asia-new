"use client"

import { Panel, PanelEmpty } from "@/components/ui/panel"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Send } from "lucide-react"
import { looksLikeHtml } from "@/lib/utils"
import { BriefIntroDialog } from "./brief-intro-dialog"
import { BriefIntroExportMenu } from "@/components/features/brief-intro-export-menu"
import type { BriefIntroWithJoins } from "@/lib/supabase/queries/student-brief-intro"
import type { BriefIntroReferenceData } from "./brief-intro-dialog"

type StudentBriefIntroSectionProps = {
  /** False for read-only staff: hides adding, editing and deleting. */
  canWrite?: boolean
  studentId: string
  briefIntro: BriefIntroWithJoins | null
  referenceData: BriefIntroReferenceData
}

function profileName(p: { first_name: string | null; surname: string | null } | null) {
  if (!p) return null
  return [p.first_name, p.surname].filter(Boolean).join(" ") || null
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  } catch { return dateStr }
}

export function StudentBriefIntroSection({
  studentId, briefIntro, referenceData, canWrite = true,
}: StudentBriefIntroSectionProps) {
  if (!briefIntro) {
    return (
      <Panel title="Brief introduction">
        <PanelEmpty
          title="No introduction yet"
          action={canWrite ? <BriefIntroDialog studentId={studentId} referenceData={referenceData} /> : null}
        >
          A short profile of the student to send to schools, in English and Chinese.
        </PanelEmpty>
      </Panel>
    )
  }

  const updatedBy = profileName(briefIntro.assigned_profile)
  return (
    <Panel
      title="Brief introduction"
      action={
        <>
          <BriefIntroExportMenu studentIds={[studentId]} />
          {canWrite && <BriefIntroDialog studentId={studentId} referenceData={referenceData} briefIntro={briefIntro} />}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {briefIntro.is_approved ? (
            <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 font-medium text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> Approved
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 font-medium text-amber-800">
              <XCircle className="h-3 w-3" /> Awaiting approval
            </Badge>
          )}
          {briefIntro.is_approved && profileName(briefIntro.approved_profile) && (
            <span className="text-xs text-muted-foreground">by {profileName(briefIntro.approved_profile)}, {formatDate(briefIntro.approved_at)}</span>
          )}
        </div>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Spoken English</dt>
            <dd className="mt-0.5 text-sm">{briefIntro.spoken_english?.label ?? briefIntro.legacy_spoken_english ?? "Not recorded"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Intended subjects</dt>
            <dd className="mt-0.5 text-sm">{briefIntro.subjects || "Not recorded"}</dd>
          </div>
          {briefIntro.hobbies && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Hobbies and interests</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed">{briefIntro.hobbies}</dd>
            </div>
          )}
          {briefIntro.remarks && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Remarks</dt>
              <dd className="mt-0.5 text-sm">
                {looksLikeHtml(briefIntro.remarks) ? (
                  // Sanitized on save in upsertStudentBriefIntro, safe to render
                  <div className="rich-content" dangerouslySetInnerHTML={{ __html: briefIntro.remarks }} />
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">{briefIntro.remarks}</p>
                )}
              </dd>
            </div>
          )}
        </dl>
        {briefIntro.sent_history && briefIntro.sent_history.length > 0 && (
          <div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Send className="h-3 w-3" /> Sent to {briefIntro.sent_history.length} {briefIntro.sent_history.length === 1 ? "school" : "schools"}</p>
            <ul className="mt-1.5 divide-y rounded-md border text-sm">
              {briefIntro.sent_history.map(entry => (
                <li key={entry.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2">
                  <span className="font-medium">{entry.school?.name ?? "Unknown school"}</span>
                  <span className="text-muted-foreground">{formatDate(entry.sent_at)}</span>
                  {entry.method && <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{entry.method}</Badge>}
                  {profileName(entry.sent_by_profile) && <span className="text-xs text-muted-foreground">by {profileName(entry.sent_by_profile)}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Updated {formatDate(briefIntro.updated_at)}{updatedBy ? ` by ${updatedBy}` : ""}</p>
      </div>
    </Panel>
  )
}
