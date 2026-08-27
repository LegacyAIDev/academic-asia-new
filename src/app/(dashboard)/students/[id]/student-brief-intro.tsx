"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Languages, CheckCircle2, XCircle, Send } from "lucide-react"
import { looksLikeHtml } from "@/lib/utils"
import { BriefIntroDialog } from "./brief-intro-dialog"
import { BriefIntroExportMenu } from "@/components/features/brief-intro-export-menu"
import type { BriefIntroWithJoins } from "@/lib/supabase/queries/student-brief-intro"
import type { BriefIntroReferenceData } from "./brief-intro-dialog"

type StudentBriefIntroSectionProps = {
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
  studentId, briefIntro, referenceData,
}: StudentBriefIntroSectionProps) {
  if (!briefIntro) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              Brief Introduction
            </CardTitle>
            <BriefIntroDialog studentId={studentId} referenceData={referenceData} />
          </div>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <Languages className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">No introduction yet</h3>
            <p className="text-sm text-muted-foreground">Write a brief introduction for this student</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Languages className="h-4 w-4 text-muted-foreground" />
            Brief Introduction
          </CardTitle>
          <div className="flex items-start gap-2">
            {/* Only offered once there is something to export — the empty state
                above has no introduction to put in a document. */}
            <BriefIntroExportMenu studentIds={[studentId]} />
            <BriefIntroDialog studentId={studentId} referenceData={referenceData} briefIntro={briefIntro} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Spoken English</p>
            <p className="text-sm font-medium">
              {briefIntro.spoken_english?.label ?? briefIntro.legacy_spoken_english ?? "—"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Intended Subjects</p>
            <p className="text-sm font-medium">{briefIntro.subjects || "—"}</p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hobbies &amp; Interests</p>
          <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">
            {briefIntro.hobbies || "—"}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Remarks</p>
          {briefIntro.remarks ? (
            looksLikeHtml(briefIntro.remarks) ? (
              // Sanitized on save in upsertStudentBriefIntro, safe to render
              <div className="rich-content" dangerouslySetInnerHTML={{ __html: briefIntro.remarks }} />
            ) : (
              <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{briefIntro.remarks}</p>
            )
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>

        {/* Approval Status */}
        <div className="flex items-center gap-3 pt-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Approval</p>
          {briefIntro.is_approved ? (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-medium gap-1">
              <CheckCircle2 className="h-3 w-3" /> Approved
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-medium gap-1">
              <XCircle className="h-3 w-3" /> Pending
            </Badge>
          )}
          {briefIntro.is_approved && profileName(briefIntro.approved_profile) && (
            <span className="text-xs text-muted-foreground">
              by {profileName(briefIntro.approved_profile)} on {formatDate(briefIntro.approved_at)}
            </span>
          )}
        </div>

        {/* Sent History */}
        {briefIntro.sent_history && briefIntro.sent_history.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Send className="h-3 w-3" /> Sent History ({briefIntro.sent_history.length})
            </p>
            <div className="space-y-1.5">
              {briefIntro.sent_history.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{entry.school?.name ?? "Unknown school"}</span>
                  <span>·</span>
                  <span>{formatDate(entry.sent_at)}</span>
                  {entry.method && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{entry.method}</Badge>}
                  {profileName(entry.sent_by_profile) && <span>by {profileName(entry.sent_by_profile)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 text-xs text-muted-foreground">
          Last updated: {formatDate(briefIntro.updated_at)}
          {profileName(briefIntro.assigned_profile) && (
            <> by <span className="font-medium text-foreground">{profileName(briefIntro.assigned_profile)}</span></>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
