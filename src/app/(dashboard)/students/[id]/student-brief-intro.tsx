"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Languages, CheckCircle2, XCircle, Send } from "lucide-react"
import { BriefIntroDialog } from "./brief-intro-dialog"
import type { BriefIntroWithJoins } from "@/lib/supabase/queries/student-brief-intro"
import type { BriefIntroReferenceData } from "./brief-intro-dialog"

type StudentBriefIntroSectionProps = {
  studentId: string
  briefIntro: BriefIntroWithJoins | null
  referenceData: BriefIntroReferenceData
}

/** Color map for spoken english proficiency levels */
const englishLevelStyles: Record<string, string> = {
  native: "bg-emerald-50 text-emerald-700 border-emerald-200",
  fluent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  excellent: "bg-sky-50 text-sky-700 border-sky-200",
  very_good: "bg-sky-50 text-sky-700 border-sky-200",
  good: "bg-blue-50 text-blue-700 border-blue-200",
  satisfactory_to_good: "bg-amber-50 text-amber-700 border-amber-200",
  fairly_good: "bg-amber-50 text-amber-700 border-amber-200",
  satisfactory: "bg-orange-50 text-orange-700 border-orange-200",
  fair: "bg-orange-50 text-orange-700 border-orange-200",
  basic: "bg-rose-50 text-rose-700 border-rose-200",
  limited: "bg-rose-50 text-rose-700 border-rose-200",
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

export function StudentBriefIntroSection({
  studentId,
  briefIntro,
  referenceData,
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
            <p className="text-sm text-muted-foreground">
              Add spoken English level, hobbies, and interests for this student
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const englishStyle = englishLevelStyles[briefIntro.spoken_english?.code ?? ""] ?? "bg-slate-50 text-slate-700 border-slate-200"
  const englishLabel = briefIntro.spoken_english?.label ?? briefIntro.legacy_spoken_english ?? null

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Languages className="h-4 w-4 text-muted-foreground" />
            Brief Introduction
          </CardTitle>
          <BriefIntroDialog studentId={studentId} referenceData={referenceData} briefIntro={briefIntro} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Spoken English</p>
            {englishLabel ? (
              <Badge variant="outline" className={`${englishStyle} border text-xs font-medium`}>
                {englishLabel}
              </Badge>
            ) : (
              <p className="text-sm font-medium">—</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Subjects</p>
            <p className="text-sm font-medium whitespace-pre-wrap">{briefIntro.subjects || "—"}</p>
          </div>
        </div>

        {briefIntro.hobbies && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hobbies</p>
            <p className="text-sm font-medium whitespace-pre-wrap">{briefIntro.hobbies}</p>
          </div>
        )}

        {briefIntro.remarks && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Remarks</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{briefIntro.remarks}</p>
          </div>
        )}

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
          {briefIntro.is_approved && briefIntro.approved_profile?.full_name && (
            <span className="text-xs text-muted-foreground">
              by {briefIntro.approved_profile.full_name} on {formatDate(briefIntro.approved_at)}
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
                  {entry.sent_by_profile?.full_name && <span>by {entry.sent_by_profile.full_name}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 text-xs text-muted-foreground">
          Last updated: {formatDate(briefIntro.updated_at)}
          {briefIntro.assigned_profile?.full_name && (
            <> by <span className="font-medium text-foreground">{briefIntro.assigned_profile.full_name}</span></>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
